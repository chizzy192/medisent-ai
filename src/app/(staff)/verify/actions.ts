"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import { cleanDosing, unitsFromDose } from "@/lib/dosing";
import { buildInstruction } from "@/lib/instructions";
import { verifierRoles } from "@/lib/intake";
import { createRefill, createReminders } from "@/lib/prescriptions";
import { sendSms } from "@/lib/sms";

/**
 * Verification queue (BUILD_PLAN "Verification queue"): a pharmacist or doctor of the patient's
 * hospital approves, edits (= corrects the dosing AND approves) or rejects a patient's own entry.
 * Every Supabase write is checked and a failure reaches the catch with its message: the card
 * shows it in development and a generic sentence in production. Old reminders and refills are
 * deactivated, never deleted (dose logs reference reminders). Every action goes to audit_log
 * and the patient is told (SMS; in demo mode to DEMO_TEST_PHONE; plus the notice on Home).
 */
export type ReviewState = { error?: string; detail?: string; fieldErrors?: Record<string, string>; done?: "verified" | "edited" | "rejected"; id?: string } | undefined;

const field = (fd: FormData, n: string) => String(fd.get(n) ?? "").trim();

/** Throws with the Supabase message so no failed write passes silently. */
function must<T extends { error: { message: string } | null }>(step: string, res: T): T {
  if (res.error) throw new Error(`${step}: ${res.error.message}`);
  return res;
}

export async function reviewEntry(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const { profile } = await requireRole(verifierRoles);
  const id = field(formData, "id");
  const intent = field(formData, "intent");
  const admin = createAdminClient();
  const { data: rx, error: loadError } = await admin.from("prescriptions").select("id,patient_id,hospital_id,drug_name,strength,form,status,source,dose").eq("id", id).maybeSingle();
  if (loadError) return fail(loadError);
  if (!rx || rx.source !== "self" || !profile.hospital_id || rx.hospital_id !== profile.hospital_id) return { error: "notYours" };
  if (rx.status !== "pending") return { error: "alreadyReviewed" };
  const { data: patient } = await admin.from("profiles").select("full_name,phone").eq("id", rx.patient_id).maybeSingle();
  const now = new Date().toISOString();
  const name = `${rx.drug_name}${rx.strength ? ` ${rx.strength}` : ""}`;

  try {
    if (intent === "reject") {
      const reason = field(formData, "reason").slice(0, 300);
      if (!reason) return { fieldErrors: { reason: "reasonRequired" } };
      must("prescription", await admin.from("prescriptions").update({ status: "rejected", verified_by: profile.id, verified_at: now, rejection_reason: reason, active: false }).eq("id", id));
      must("reminders", await admin.from("reminders").update({ active: false }).eq("prescription_id", id));
      must("refills", await admin.from("refills").update({ refilled: true }).eq("prescription_id", id).eq("refilled", false));
      await audit(profile.id, "prescription_rejected", id, { reason, patient_id: rx.patient_id });
      await notify(patient?.phone, `Medisent AI: your pharmacist could not approve ${name}. Reason: ${reason}. Please visit the pharmacy.`, id);
      revalidate(rx.patient_id);
      return { done: "rejected", id };
    }

    if (intent === "edit") {
      const { value, errors } = cleanDosing({
        dose: field(formData, "dose"),
        frequency: field(formData, "frequency"),
        duration: field(formData, "duration"),
        withFood: field(formData, "withFood"),
        times: formData.getAll("times").map(String),
        quantity: field(formData, "quantity"),
      });
      if (Object.keys(errors).length) return { fieldErrors: errors };
      const instruction = buildInstruction({ dose: value.dose, form: rx.form ?? "", frequency_per_day: value.times.length, duration_days: value.duration_days, with_food: value.with_food, times: value.times });
      must(
        "prescription",
        await admin
          .from("prescriptions")
          .update({
            dose: value.dose,
            frequency_per_day: value.times.length,
            duration_days: value.duration_days,
            with_food: value.with_food,
            instructions_plain: instruction,
            quantity_dispensed: value.quantity,
            status: "edited",
            verified_by: profile.id,
            verified_at: now,
          })
          .eq("id", id),
      );
      // Old reminders stay (dose logs point at them) but stop; the corrected times are new rows.
      must("reminders", await admin.from("reminders").update({ active: false }).eq("prescription_id", id));
      await createReminders(id, rx.patient_id, value.times);
      must("refills", await admin.from("refills").update({ refilled: true }).eq("prescription_id", id).eq("refilled", false));
      await createRefill(id, rx.patient_id, value.quantity, value.times.length, unitsFromDose(value.dose), value.duration_days);
      await audit(profile.id, "prescription_edited", id, { patient_id: rx.patient_id, before: { dose: rx.dose }, after: { dose: value.dose, times: value.times, duration_days: value.duration_days, with_food: value.with_food } });
      await notify(patient?.phone, `Medisent AI: your pharmacist checked ${name} and changed the instructions. Open the app to hear them: ${instruction}`, id);
      revalidate(rx.patient_id);
      return { done: "edited", id };
    }

    must("prescription", await admin.from("prescriptions").update({ status: "verified", verified_by: profile.id, verified_at: now }).eq("id", id));
    await audit(profile.id, "prescription_verified", id, { patient_id: rx.patient_id });
    await notify(patient?.phone, `Medisent AI: your pharmacist approved ${name}. Your reminders are confirmed.`, id);
    revalidate(rx.patient_id);
    return { done: "verified", id };
  } catch (error) {
    return fail(error);
  }
}

function fail(error: unknown): ReviewState {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error);
  console.error("[verify]", message);
  return { error: "server", detail: process.env.NODE_ENV === "production" ? undefined : message };
}

async function audit(actorId: string, action: string, id: string, detail: Record<string, unknown>) {
  must("audit_log", await createAdminClient().from("audit_log").insert({ actor_id: actorId, action, target_table: "prescriptions", target_id: id, detail }));
}

async function notify(phone: string | null | undefined, text: string, id: string) {
  if (phone) await sendSms(phone, text);
  must("patient_notified_at", await createAdminClient().from("prescriptions").update({ patient_notified_at: new Date().toISOString() }).eq("id", id));
}

function revalidate(patientId: string) {
  revalidatePath("/verify");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/home");
  revalidatePath("/meds");
}
