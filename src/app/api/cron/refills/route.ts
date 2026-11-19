import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/admin";
import { isServiceRoleConfigured } from "@/lib/db/env";
import { daysLeft, lagosDate } from "@/lib/reminders";
import { sendSms } from "@/lib/sms";

/**
 * Daily refill job (BUILD_PLAN Stage 2): for every active refill running out within
 * alert_days_before, alert the patient (app alert + SMS in their language) and the hospital's
 * pharmacists (alert row), once. Call it from a scheduler with `Authorization: Bearer CRON_SECRET`
 * (Vercel Cron sets this automatically); in development you can GET it from the browser when
 * CRON_SECRET is unset.
 */
const smsText: Record<string, (drug: string, days: number) => string> = {
  en: (d, n) => (n <= 0 ? `Medisent AI: your ${d} runs out today. Please get a refill from your pharmacy.` : `Medisent AI: your ${d} runs out in ${n} day${n === 1 ? "" : "s"}. Please get a refill from your pharmacy.`),
  pcm: (d, n) => (n <= 0 ? `Medisent AI: your ${d} go finish today. Abeg go collect more from your pharmacy.` : `Medisent AI: your ${d} go finish in ${n} day${n === 1 ? "" : "s"}. Abeg go collect more from your pharmacy.`),
  ig: (d, n) => (n <= 0 ? `Medisent AI: ọgwụ ${d} gị na-agwụ taa. Biko gaa nweta ọzọ n'ụlọ ahịa ọgwụ gị.` : `Medisent AI: ọgwụ ${d} gị ga-agwụ n'ime ụbọchị ${n}. Biko gaa nweta ọzọ n'ụlọ ahịa ọgwụ gị.`),
  yo: (d, n) => (n <= 0 ? `Medisent AI: oògùn ${d} rẹ yóò tán lónìí. Jọ̀wọ́ lọ gba síi ní ilé ìtajà oògùn rẹ.` : `Medisent AI: oògùn ${d} rẹ yóò tán ní ọjọ́ ${n}. Jọ̀wọ́ lọ gba síi ní ilé ìtajà oògùn rẹ.`),
  ha: (d, n) => (n <= 0 ? `Medisent AI: maganin ${d} naka zai ƙare yau. Don Allah ka sake siya daga kantin maganinka.` : `Medisent AI: maganin ${d} naka zai ƙare cikin kwana ${n}. Don Allah ka sake siya daga kantin maganinka.`),
};

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
      admin.from("profiles").select("full_name,phone,language").eq("id", r.patient_id).maybeSingle(),
    ]);
    if (!p?.active || !patient) continue;
    // A fixed course (e.g. 3 days of malaria tablets) is finished, not refilled.
    if (p.duration_days) continue;
    const drug = `${p.drug_name}${p.strength ? ` ${p.strength}` : ""}`;
    const n = Math.max(0, left);
    await admin.from("alerts").insert([
      { patient_id: r.patient_id, hospital_id: p.hospital_id, type: "refill", detail: n <= 0 ? `${patient.full_name}: ${drug} runs out today.` : `${patient.full_name}: ${drug} runs out in ${n} day${n === 1 ? "" : "s"}.` },
    ]);
    if (patient.phone) await sendSms(patient.phone, (smsText[patient.language] ?? smsText.en)(drug, n));
    await admin.from("refills").update({ alerted_at: new Date().toISOString() }).eq("id", r.id);
    alerted++;
  }
  return NextResponse.json({ ok: true, checked: refills?.length ?? 0, alerted, today });
}
