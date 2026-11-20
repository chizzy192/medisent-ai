import { createAdminClient } from "@/lib/db/admin";
import { sendSms } from "@/lib/sms";

/**
 * Staff alerts and caregiver messages, one place. Alerts are what the dashboard and the
 * Alerts tab show; caregiver messages are SMS to a caregiver who replied YES, logged in
 * caregiver_alerts (one row per caregiver per reason and slot).
 */
export type AlertType = "red_flag" | "side_effect" | "missed_doses" | "high_risk" | "interaction" | "question" | "drug_not_found" | "refill" | "course_at_risk" | "course_stopped";

export async function raiseAlert(args: { patientId: string; hospitalId: string | null; type: AlertType; detail: string; prescriptionId?: string | null; source?: string; dedupeHours?: number }): Promise<string | null> {
  if (!args.hospitalId) return null;
  const admin = createAdminClient();
  if (args.dedupeHours) {
    const since = new Date(Date.now() - args.dedupeHours * 3600_000).toISOString();
    const { data: recent } = await admin.from("alerts").select("id").eq("patient_id", args.patientId).eq("type", args.type).eq("status", "open").gte("created_at", since).limit(1).maybeSingle();
    if (recent) return recent.id;
  }
  const { data, error } = await admin
    .from("alerts")
    .insert({ patient_id: args.patientId, hospital_id: args.hospitalId, type: args.type, detail: args.detail.slice(0, 500), prescription_id: args.prescriptionId ?? null, source: args.source ?? null })
    .select("id")
    .single();
  if (error) throw new Error(`alerts: ${error.message}`);
  return data?.id ?? null;
}

export type CaregiverRow = { id: string; patient_id: string; full_name: string; relationship: string | null; phone: string; notify_after_missed: number; status: "pending" | "accepted" | "paused"; active: boolean };

/** Caregivers who may be messaged: accepted (replied YES) and not paused or removed. */
export async function activeCaregivers(patientId: string): Promise<CaregiverRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("caregivers").select("id,patient_id,full_name,relationship,phone,notify_after_missed,status,active").eq("patient_id", patientId).eq("active", true).eq("status", "accepted");
  return (data ?? []) as CaregiverRow[];
}

/**
 * Sends one SMS per active caregiver and logs it. `slotKey` makes a dose slot idempotent
 * (reminder id + scheduled time): the unique index refuses a second row, so nothing is sent twice.
 */
export async function notifyCaregivers(args: { patientId: string; reason: "missed_dose" | "red_flag"; text: string; slotKey?: string; doseLogId?: string | null; minMissed?: number }): Promise<number> {
  const admin = createAdminClient();
  let sent = 0;
  for (const c of await activeCaregivers(args.patientId)) {
    if (args.reason === "missed_dose" && args.minMissed !== undefined && args.minMissed < c.notify_after_missed) continue;
    if (args.slotKey) {
      const { data: dup } = await admin.from("caregiver_alerts").select("id").eq("caregiver_id", c.id).eq("slot_key", args.slotKey).limit(1).maybeSingle();
      if (dup) continue;
    }
    const sms = await sendSms(c.phone, args.text);
    const { error } = await admin.from("caregiver_alerts").insert({
      caregiver_id: c.id,
      patient_id: args.patientId,
      dose_log_id: args.doseLogId ?? null,
      channel: "sms",
      status: sms.sent ? "sent" : "failed",
      reason: args.reason,
      detail: `${args.text}${sms.sent ? "" : ` [not sent: ${sms.reason ?? "unknown"}]`}`.slice(0, 500),
      slot_key: args.slotKey ?? null,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(`caregiver_alerts: ${error.message}`);
    if (!error) sent++;
  }
  return sent;
}
