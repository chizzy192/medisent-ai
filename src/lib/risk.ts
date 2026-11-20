import { createAdminClient } from "@/lib/db/admin";
import { raiseAlert } from "@/lib/alerts";
import { loadCourses } from "@/lib/course";

/**
 * Adherence risk score (BUILD_PLAN section 5), recalculated after every dose log and check-in
 * and once a day by the cron:
 *   40 × missed rate (7 days) + 20 × late rate (7 days) + 15 × side effect reported (7 days)
 *   + 10 × low-mood check-ins / 7 + 10 × (3+ doses a day) + 5 × (no check-in for 3 days)
 *   + 15 when a course is at risk, + 10 per open red flag (capped at 100).
 * Bands: 0–39 low · 40–69 medium · 70–100 high → one staff alert per day.
 */
export type RiskBand = "low" | "medium" | "high";
export type RiskResult = { score: number; band: RiskBand; detail: Record<string, number | boolean> };

export function bandFor(score: number): RiskBand {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

export async function computeRisk(patientId: string): Promise<RiskResult> {
  const admin = createAdminClient();
  const now = Date.now();
  const d7 = new Date(now - 7 * 86_400_000).toISOString();
  const d3 = new Date(now - 3 * 86_400_000).toISOString();
  const [{ data: logs }, { data: checkins }, { data: rems }, { data: redFlags }, courses] = await Promise.all([
    admin.from("dose_logs").select("status,scheduled_at").eq("patient_id", patientId).gte("scheduled_at", d7).lte("scheduled_at", new Date(now).toISOString()),
    admin.from("checkins").select("mood,side_effects,created_at").eq("patient_id", patientId).gte("created_at", d7),
    admin.from("reminders").select("prescription_id").eq("patient_id", patientId).eq("active", true),
    admin.from("alerts").select("id").eq("patient_id", patientId).eq("type", "red_flag").eq("status", "open"),
    loadCourses(admin, { patientId }).catch(() => []),
  ]);
  const total = logs?.length ?? 0;
  const missed = (logs ?? []).filter((l) => l.status === "missed").length;
  const late = (logs ?? []).filter((l) => l.status === "late").length;
  const missedRate = total ? missed / total : 0;
  const lateRate = total ? late / total : 0;
  const sideEffect = (checkins ?? []).some((c) => Array.isArray(c.side_effects) && c.side_effects.length > 0);
  const lowMood = (checkins ?? []).filter((c) => c.mood === "low").length;
  const noCheckin3d = !(checkins ?? []).some((c) => c.created_at >= d3);
  const perDay = new Map<string, number>();
  for (const r of rems ?? []) perDay.set(r.prescription_id, (perDay.get(r.prescription_id) ?? 0) + 1);
  const manyDoses = [...perDay.values()].some((n) => n >= 3);
  const courseAtRisk = courses.some((c) => c.atRisk);
  const openRedFlags = redFlags?.length ?? 0;

  const raw = 40 * missedRate + 20 * lateRate + (sideEffect ? 15 : 0) + 10 * Math.min(1, lowMood / 7) + (manyDoses ? 10 : 0) + (noCheckin3d ? 5 : 0) + (courseAtRisk ? 15 : 0) + 10 * Math.min(2, openRedFlags);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { score, band: bandFor(score), detail: { missedRate: Math.round(missedRate * 100), lateRate: Math.round(lateRate * 100), sideEffect, lowMood, noCheckin3d, manyDoses, courseAtRisk, openRedFlags, doses7d: total } };
}

/** Recalculate, store, and alert once a day when high. Returns the new result. */
export async function recalcRisk(patientId: string, hospitalId: string | null): Promise<RiskResult> {
  const admin = createAdminClient();
  const result = await computeRisk(patientId);
  const { error } = await admin.from("risk_scores").upsert({ patient_id: patientId, score: result.score, band: result.band, detail: result.detail, updated_at: new Date().toISOString() }, { onConflict: "patient_id" });
  if (error) throw new Error(`risk_scores: ${error.message}`);
  if (result.band === "high" && hospitalId) {
    const { data: patient } = await admin.from("profiles").select("full_name").eq("id", patientId).maybeSingle();
    await raiseAlert({ patientId, hospitalId, type: "high_risk", detail: `Adherence risk high (${result.score}) for ${patient?.full_name ?? "patient"}: ${result.detail.missedRate}% missed, ${result.detail.lateRate}% late this week${result.detail.courseAtRisk ? ", course at risk" : ""}${result.detail.sideEffect ? ", side effect reported" : ""}.`, source: "risk", dedupeHours: 24 });
  }
  return result;
}
