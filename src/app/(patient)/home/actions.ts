"use server";

import { revalidatePath } from "next/cache";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import { lagosDate, LATE_AFTER_MS, SNOOZE_MS } from "@/lib/reminders";

/**
 * Dose logging (BUILD_PLAN Stage 2 "Reminder screen: Taken / Snooze / Missed → dose_logs").
 * One row per reminder per scheduled time; the patient can only log their own reminders.
 */
export type DoseAction = "taken" | "snoozed" | "missed";

export async function logDose(reminderId: string, scheduledAtIso: string, action: DoseAction): Promise<{ ok: boolean; status?: string }> {
  const { profile } = await requireRole(patientRoles);
  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) return { ok: false };
  const admin = createAdminClient();
  const { data: reminder } = await admin.from("reminders").select("id,patient_id").eq("id", reminderId).maybeSingle();
  if (!reminder || reminder.patient_id !== profile.id) return { ok: false };

  const now = new Date();
  const status = action === "taken" ? (now.getTime() - scheduledAt.getTime() > LATE_AFTER_MS ? "late" : "taken") : action;
  const { error } = await admin.from("dose_logs").upsert(
    {
      reminder_id: reminderId,
      patient_id: profile.id,
      scheduled_at: scheduledAt.toISOString(),
      status,
      logged_at: now.toISOString(),
      snoozed_until: action === "snoozed" ? new Date(now.getTime() + SNOOZE_MS).toISOString() : null,
      synced: true,
    },
    { onConflict: "reminder_id,scheduled_at" },
  );
  if (error) return { ok: false };
  revalidatePath("/home");
  return { ok: true, status };
}

/** "I got a refill": a new refill row from today with the same pack size. */
export async function markRefilled(prescriptionId: string, quantity?: number): Promise<{ ok: boolean }> {
  const { profile } = await requireRole(patientRoles);
  const admin = createAdminClient();
  const { data: p } = await admin.from("prescriptions").select("id,patient_id,frequency_per_day,quantity_dispensed,dose").eq("id", prescriptionId).maybeSingle();
  if (!p || p.patient_id !== profile.id) return { ok: false };
  const qty = quantity && quantity > 0 ? Math.round(quantity) : p.quantity_dispensed;
  if (!qty) return { ok: false };
  await admin.from("refills").update({ refilled: true }).eq("prescription_id", prescriptionId).eq("refilled", false);
  const units = Number(String(p.dose ?? "").match(/^(\d+(?:\.\d+)?)/)?.[1] ?? 1) || 1;
  const { error } = await admin.from("refills").insert({ prescription_id: prescriptionId, patient_id: profile.id, quantity_dispensed: qty, doses_per_day: p.frequency_per_day, units_per_dose: units, dispensed_on: lagosDate() });
  if (error) return { ok: false };
  await admin.from("prescriptions").update({ quantity_dispensed: qty }).eq("id", prescriptionId);
  revalidatePath("/home");
  revalidatePath("/meds");
  return { ok: true };
}
