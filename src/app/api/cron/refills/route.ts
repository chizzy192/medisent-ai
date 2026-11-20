import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/admin";
import { isServiceRoleConfigured } from "@/lib/db/secrets";
import { daysLeft, lagosDate } from "@/lib/reminders";
import { sendSms } from "@/lib/sms";
import { checkCourseRisk, loadCourses } from "@/lib/course";
import { sweepUnconfirmedDoses } from "@/lib/caregivers";
import { recalcRisk } from "@/lib/risk";

/**
 * Daily refill job (BUILD_PLAN Stage 2): for every active refill running out within
 * alert_days_before, alert the patient (app alert + SMS in plain English) and the hospital's
 * pharmacists (alert row), once. Call it from a scheduler with `Authorization: Bearer CRON_SECRET`
 * (Vercel Cron sets this automatically); in development you can GET it from the browser when
 * CRON_SECRET is unset.
 */
const smsText = (d: string, n: number) => (n <= 0 ? `Medisent AI: your ${d} runs out today. Please get a refill from your pharmacy.` : `Medisent AI: your ${d} runs out in ${n} day${n === 1 ? "" : "s"}. Please get a refill from your pharmacy.`);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const admin = createAdminClient();
  const today = lagosDate();
  const { data: refills } = await admin
    .from("refills")
    .select("id,prescription_id,patient_id,runs_out_on,alert_days_before,alerted_at,refilled")
    .eq("refilled", false);

  let alerted = 0;
  for (const r of refills ?? []) {
    const left = daysLeft(r, today);
    if (left > r.alert_days_before) continue;
    // Alert once at the threshold and once more on the day it runs out.
    const alertedToday = r.alerted_at && r.alerted_at.slice(0, 10) === today;
    const firstAlert = !r.alerted_at;
    const dayZero = left <= 0 && r.alerted_at && r.alerted_at.slice(0, 10) < r.runs_out_on;
    if (alertedToday || (!firstAlert && !dayZero)) continue;
    const [{ data: p }, { data: patient }] = await Promise.all([
      admin.from("prescriptions").select("drug_name,strength,hospital_id,active,duration_days,started_on").eq("id", r.prescription_id).maybeSingle(),
      admin.from("profiles").select("full_name,phone").eq("id", r.patient_id).maybeSingle(),
    ]);
    if (!p?.active || !patient) continue;
    // A fixed course (e.g. 3 days of malaria tablets) is finished, not refilled.
    if (p.duration_days) continue;
    const drug = `${p.drug_name}${p.strength ? ` ${p.strength}` : ""}`;
    const n = Math.max(0, left);
    await admin.from("alerts").insert([
      { patient_id: r.patient_id, hospital_id: p.hospital_id, type: "refill", detail: n <= 0 ? `${patient.full_name}: ${drug} runs out today.` : `${patient.full_name}: ${drug} runs out in ${n} day${n === 1 ? "" : "s"}.` },
    ]);
    if (patient.phone) await sendSms(patient.phone, smsText(drug, n));
    await admin.from("refills").update({ alerted_at: new Date().toISOString() }).eq("id", r.id);
    alerted++;
  }
  // Finish-your-course: every active course with 2+ missed doses gets one alert and one SMS.
  let coursesAtRisk = 0;
  for (const c of await loadCourses(admin, {})) if (c.atRisk && (await checkCourseRisk(c.prescriptionId))) coursesAtRisk++;
  // Caregivers: today's doses not confirmed 60 minutes after the reminder.
  const caregiverSms = await sweepUnconfirmedDoses().catch((e) => {
    console.error("[caregiver sweep]", e);
    return 0;
  });
  // Risk score for every patient (also recalculated live after each dose log and check-in).
  const { data: patients } = await admin.from("profiles").select("id,hospital_id").eq("role", "patient").eq("verified_status", "verified");
  let risks = 0;
  for (const p of patients ?? []) {
    await recalcRisk(p.id, p.hospital_id).then(() => risks++).catch((e) => console.error("[risk]", e));
  }
  return NextResponse.json({ ok: true, checked: refills?.length ?? 0, alerted, coursesAtRisk, caregiverSms, risks, today });
}
