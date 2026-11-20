"use server";

import { revalidatePath } from "next/cache";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import { demoMode, isValidNigerianPhone, normalizePhone } from "@/lib/db/env";
import { acceptByPhone, sendInvite } from "@/lib/caregivers";

/**
 * Caregiver mode, patient side (BUILD_PLAN Stage 3): add (with consent tick) → invitation SMS
 * → the caregiver replies YES → alerts flow. Pause, resume, remove, resend at any time.
 * In demo mode a "simulate YES" button stands in for the reply so judges can see the flow.
 */
export type CaregiverState = { error?: string; fieldErrors?: Record<string, string>; ok?: string } | undefined;
const field = (fd: FormData, n: string) => String(fd.get(n) ?? "").trim();

export async function addCaregiver(_prev: CaregiverState, formData: FormData): Promise<CaregiverState> {
  const { profile } = await requireRole(patientRoles);
  const fieldErrors: Record<string, string> = {};
  const name = field(formData, "fullName").slice(0, 80);
  const relationship = field(formData, "relationship").slice(0, 40);
  const phone = normalizePhone(field(formData, "phone"));
  const after = field(formData, "notifyAfter") === "2" ? 2 : 1;
  if (!name) fieldErrors.fullName = "nameRequired";
  if (!isValidNigerianPhone(phone)) fieldErrors.phone = "phoneInvalid";
  if (phone && phone === profile.phone) fieldErrors.phone = "ownPhone";
  if (formData.get("consent") !== "on") fieldErrors.consent = "consentRequired";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("caregivers")
    .insert({ patient_id: profile.id, full_name: name, relationship: relationship || null, phone, channel: "sms", notify_after_missed: after, consent_at: new Date().toISOString(), status: "pending", active: true })
    .select("id")
    .single();
  if (error || !data) return { error: "server" };
  const invite = await sendInvite(data.id).catch((e) => {
    console.error("[caregiver invite]", e);
    return { sent: false, reason: "error" };
  });
  await admin.from("audit_log").insert({ actor_id: profile.id, action: "caregiver_added", target_table: "caregivers", target_id: data.id, detail: { notify_after_missed: after } });
  revalidatePath("/me");
  return { ok: invite.sent ? "invited" : "invitedNotSent" };
}

async function own(id: string) {
  const { profile } = await requireRole(patientRoles);
  const admin = createAdminClient();
  const { data } = await admin.from("caregivers").select("id,patient_id,phone,status").eq("id", id).maybeSingle();
  if (!data || data.patient_id !== profile.id) return null;
  return { admin, profile, c: data };
}

export async function setCaregiverStatus(id: string, action: "pause" | "resume" | "remove" | "resend" | "simulateYes"): Promise<{ ok: boolean }> {
  const o = await own(String(id));
  if (!o) return { ok: false };
  const now = new Date().toISOString();
  if (action === "pause") await o.admin.from("caregivers").update({ status: "paused", paused_at: now }).eq("id", o.c.id);
  if (action === "resume") await o.admin.from("caregivers").update({ status: o.c.status === "paused" ? "accepted" : o.c.status, paused_at: null }).eq("id", o.c.id);
  if (action === "remove") await o.admin.from("caregivers").update({ active: false }).eq("id", o.c.id);
  if (action === "resend") await sendInvite(o.c.id).catch((e) => console.error("[caregiver invite]", e));
  if (action === "simulateYes") {
    if (!demoMode) return { ok: false };
    await acceptByPhone(o.c.phone, "YES");
  }
  await o.admin.from("audit_log").insert({ actor_id: o.profile.id, action: `caregiver_${action}`, target_table: "caregivers", target_id: o.c.id, detail: null });
  revalidatePath("/me");
  return { ok: true };
}
