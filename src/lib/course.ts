import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/db/admin";
import { lagosDate, lagosInstant } from "@/lib/reminders";
import { sendSms } from "@/lib/sms";

/**
 * Finish-your-course tracker (antibiotics and antimalarials): a prescription whose formulary
 * drug is `course_required` and that has a duration. Progress comes from dose_logs: day N of
 * D, doses taken, doses left, doses missed (logged missed, or a past slot with no log).
 * Two or more missed doses = "course at risk" → patient SMS + staff alert, once per course.
 * "I stopped early" → alert for the doctor.
 */
export type CourseProgress = {
  prescriptionId: string;
  patientId: string;
  hospitalId: string | null;
  patientName?: string;
  drugName: string;
  strength: string | null;
  durationDays: number;
  startedOn: string;
  endsOn: string;
  day: number;
  totalDoses: number;
  taken: number;
  missed: number;
  left: number;
  finished: boolean;
  completed: boolean;
  atRisk: boolean;
  stoppedEarly: boolean;
  instruction: string | null;
};

type Rx = { id: string; patient_id: string; hospital_id: string | null; drug_name: string; strength: string | null; duration_days: number | null; started_on: string; frequency_per_day: number; instructions_plain: string | null; stopped_early_at: string | null; active: boolean; status: string };
type Rem = { id: string; prescription_id: string; time_of_day: string; active: boolean };
type Log = { reminder_id: string; scheduled_at: string; status: string };

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00+01:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return lagosDate(d);
};

/** Courses for one patient (patientId) or for a whole hospital (RLS-scoped client, patientId omitted). */
export async function loadCourses(client: SupabaseClient, opts: { patientId?: string; includeFinished?: boolean } = {}): Promise<CourseProgress[]> {
  let q = client.from("prescriptions").select("id,patient_id,hospital_id,drug_name,strength,duration_days,started_on,frequency_per_day,instructions_plain,stopped_early_at,active,status").eq("course_required", true).not("duration_days", "is", null).neq("status", "rejected");
  if (opts.patientId) q = q.eq("patient_id", opts.patientId);
  const { data: rxs, error: rxError } = await q;
  if (rxError) throw new Error(`courses: prescriptions: ${rxError.message}`);
  const courses = ((rxs ?? []) as Rx[]).filter((r) => r.duration_days);
  if (!courses.length) return [];
  const ids = courses.map((c) => c.id);
  const { data: rems, error: remError } = await client.from("reminders").select("id,prescription_id,time_of_day,active").in("prescription_id", ids);
  if (remError) throw new Error(`courses: reminders: ${remError.message}`);
  const reminderIds = (rems ?? []).map((r) => r.id);
  const { data: logs, error: logError } = reminderIds.length
    ? await client.from("dose_logs").select("reminder_id,scheduled_at,status").in("reminder_id", reminderIds)
    : { data: [] as Log[], error: null };
  if (logError) throw new Error(`courses: dose_logs: ${logError.message}`);
  const today = lagosDate();
  const now = new Date();
  const logByKey = new Map(((logs ?? []) as Log[]).map((l) => [`${l.reminder_id}|${new Date(l.scheduled_at).getTime()}`, l.status]));
  const out: CourseProgress[] = [];
  for (const c of courses) {
    const duration = c.duration_days!;
    const myRems = ((rems ?? []) as Rem[]).filter((r) => r.prescription_id === c.id && r.active);
    const perDay = myRems.length || c.frequency_per_day;
    const endsOn = addDays(c.started_on, duration - 1);
    const dayIndex = Math.floor((new Date(`${today}T00:00:00+01:00`).getTime() - new Date(`${c.started_on}T00:00:00+01:00`).getTime()) / 86_400_000);
    const finished = today > endsOn || Boolean(c.stopped_early_at);
    if (finished && !opts.includeFinished) continue;
    let taken = 0;
    let missed = 0;
    for (let d = 0; d < duration; d++) {
      const date = addDays(c.started_on, d);
      if (date > today) break;
      for (const r of myRems) {
        const at = lagosInstant(date, r.time_of_day.slice(0, 5));
        const status = logByKey.get(`${r.id}|${at.getTime()}`);
        if (status === "taken" || status === "late") taken++;
        else if (status === "missed") missed++;
        else if (!status && at.getTime() < now.getTime() - 2 * 60 * 60 * 1000 && date < today) missed++;
      }
    }
    const totalDoses = duration * perDay;
    out.push({
      prescriptionId: c.id,
      patientId: c.patient_id,
      hospitalId: c.hospital_id,
      drugName: c.drug_name,
      strength: c.strength,
      durationDays: duration,
      startedOn: c.started_on,
      endsOn,
      day: Math.min(duration, Math.max(1, dayIndex + 1)),
      totalDoses,
      taken,
      missed,
      left: Math.max(0, totalDoses - taken),
      finished,
      // One definition everywhere: finished (not stopped early) with at most one missed dose.
      completed: finished && !c.stopped_early_at && missed <= 1,
      atRisk: !finished && missed >= 2,
      stoppedEarly: Boolean(c.stopped_early_at),
      instruction: c.instructions_plain,
    });
  }
  return out;
}

/** After a missed dose (or daily from the cron): alert once per course when 2+ doses are missed. */
export async function checkCourseRisk(prescriptionId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [course] = (await loadCourses(admin, {})).filter((c) => c.prescriptionId === prescriptionId);
  if (!course?.atRisk) return false;
  const { data: open } = await admin.from("alerts").select("id").eq("prescription_id", prescriptionId).eq("type", "course_at_risk").limit(1);
  if (open?.length) return false;
  const { data: patient } = await admin.from("profiles").select("full_name,phone").eq("id", course.patientId).maybeSingle();
  const drug = `${course.drugName}${course.strength ? ` ${course.strength}` : ""}`;
  if (course.hospitalId) {
    const { error } = await admin.from("alerts").insert({
      patient_id: course.patientId,
      hospital_id: course.hospitalId,
      prescription_id: prescriptionId,
      type: "course_at_risk",
      detail: `Course at risk: ${patient?.full_name ?? "patient"} has missed ${course.missed} doses of ${drug} (day ${course.day} of ${course.durationDays}).`,
    });
    if (error) throw new Error(`alerts: ${error.message}`);
  }
  if (patient?.phone) await sendSms(patient.phone, `Medisent AI: you have missed ${course.missed} doses of ${drug}. Please keep taking it until the last dose, even if you feel better. Ask your pharmacist if you are unsure.`);
  return true;
}
