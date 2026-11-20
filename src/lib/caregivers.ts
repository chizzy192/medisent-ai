import { createAdminClient } from "@/lib/db/admin";
import { notifyCaregivers } from "@/lib/alerts";
import { lagosDate, lagosInstant, timeLabel } from "@/lib/reminders";
import { normalizePhone } from "@/lib/db/env";
import { sendSms } from "@/lib/sms";

/**
 * Caregiver mode (BUILD_PLAN Stage 3): invite by SMS, the caregiver replies YES, then missed
 * doses (1 or 2, the patient's choice) and red flags reach them. Pause / remove at any time.
 */
export async function sendInvite(caregiverId: string): Promise<{ sent: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data: c } = await admin.from("caregivers").select("id,phone,full_name,patient_id").eq("id", caregiverId).maybeSingle();
  if (!c) return { sent: false, reason: "missing" };
  const { data: p } = await admin.from("profiles").select("full_name").eq("id", c.patient_id).maybeSingle();
  const sms = await sendSms(c.phone, `Medisent AI: ${p?.full_name ?? "A patient"} wants you as their caregiver. You would get a text when they miss a dose or need urgent help. Reply YES to accept, or ignore this message.`);
  await admin.from("caregivers").update({ invited_at: new Date().toISOString() }).eq("id", caregiverId);
  await admin.from("caregiver_alerts").insert({ caregiver_id: c.id, patient_id: c.patient_id, channel: "sms", status: sms.sent ? "sent" : "failed", reason: "invite", detail: sms.sent ? "Invitation sent" : `Invitation not sent: ${sms.reason ?? "unknown"}` });
  return { sent: sms.sent, reason: sms.reason };
}

/** Inbound SMS "YES" from a phone that has a pending invitation. Returns how many were accepted. */
export async function acceptByPhone(fromPhone: string, text: string): Promise<number> {
  if (!/^\s*(yes|y|accept|ok|okay)\b/i.test(text)) return 0;
  const phone = normalizePhone(fromPhone);
  if (!phone) return 0;
  const admin = createAdminClient();
  const { data } = await admin.from("caregivers").update({ status: "accepted", accepted_at: new Date().toISOString(), consent_at: new Date().toISOString() }).eq("phone", phone).eq("status", "pending").eq("active", true).select("id");
  return data?.length ?? 0;
}

/** Called when a dose is logged as missed. The caregiver's threshold is missed doses in the last 24 hours. */
export async function caregiverMissedDose(args: { patientId: string; reminderId: string; scheduledAt: Date; doseLogId?: string | null }): Promise<number> {
  const admin = createAdminClient();
  const since = new Date(args.scheduledAt.getTime() - 24 * 3600_000).toISOString();
  const [{ count }, { data: rem }, { data: patient }] = await Promise.all([
    admin.from("dose_logs").select("id", { count: "exact", head: true }).eq("patient_id", args.patientId).eq("status", "missed").gte("scheduled_at", since).lte("scheduled_at", args.scheduledAt.toISOString()),
    admin.from("reminders").select("prescription_id, prescriptions(drug_name,strength,dose)").eq("id", args.reminderId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", args.patientId).maybeSingle(),
  ]);
  const rx = (Array.isArray(rem?.prescriptions) ? rem?.prescriptions[0] : rem?.prescriptions) as { drug_name: string; strength: string | null; dose: string | null } | null | undefined;
  const drug = rx ? `${rx.drug_name}${rx.strength ? ` ${rx.strength}` : ""}` : "their medicine";
  const text = `Medisent AI: ${patient?.full_name ?? "Your relative"} has not taken their ${timeLabel(args.scheduledAt)} ${drug}${rx?.dose ? ` (${rx.dose})` : ""}. Please check on them.`;
  return notifyCaregivers({ patientId: args.patientId, reason: "missed_dose", text, slotKey: `${args.reminderId}:${args.scheduledAt.toISOString()}`, doseLogId: args.doseLogId ?? null, minMissed: Math.max(1, count ?? 1) });
}

/**
 * Daily/hourly sweep (cron): today's reminder slots more than 60 minutes old with no log count
 * as missed for the caregiver. Each slot is sent once (slot key).
 */
export async function sweepUnconfirmedDoses(): Promise<number> {
  const admin = createAdminClient();
  const today = lagosDate();
  const now = Date.now();
  const { data: rems } = await admin.from("reminders").select("id,patient_id,time_of_day,prescriptions!inner(active,status)").eq("active", true).eq("prescriptions.active", true);
  let sent = 0;
  for (const r of rems ?? []) {
    const at = lagosInstant(today, String(r.time_of_day).slice(0, 5));
    if (now - at.getTime() < 60 * 60_000) continue;
    const { data: log } = await admin.from("dose_logs").select("id,status").eq("reminder_id", r.id).eq("scheduled_at", at.toISOString()).maybeSingle();
    if (log && log.status !== "missed") continue;
    sent += await caregiverMissedDose({ patientId: r.patient_id, reminderId: r.id, scheduledAt: at, doseLogId: log?.id ?? null });
  }
  return sent;
}
