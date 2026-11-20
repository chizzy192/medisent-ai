"use server";

import { revalidatePath } from "next/cache";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";

/** "I stopped this course early": records it, stops the reminders and alerts the doctor. */
export async function stopCourseEarly(prescriptionId: string): Promise<{ ok: boolean }> {
  const { profile } = await requireRole(patientRoles);
  const admin = createAdminClient();
  const { data: p } = await admin.from("prescriptions").select("id,patient_id,hospital_id,drug_name,strength,duration_days,started_on,stopped_early_at").eq("id", prescriptionId).maybeSingle();
  if (!p || p.patient_id !== profile.id) return { ok: false };
  if (p.stopped_early_at) return { ok: true };
  const now = new Date().toISOString();
  const { error } = await admin.from("prescriptions").update({ stopped_early_at: now }).eq("id", prescriptionId);
  if (error) return { ok: false };
  await admin.from("reminders").update({ active: false }).eq("prescription_id", prescriptionId);
  if (p.hospital_id) {
    await admin.from("alerts").insert({
      patient_id: profile.id,
      hospital_id: p.hospital_id,
      prescription_id: prescriptionId,
      type: "course_stopped",
      detail: `For the doctor: ${profile.full_name} stopped ${p.drug_name}${p.strength ? ` ${p.strength}` : ""} early (a ${p.duration_days}-day course started ${p.started_on}).`,
    });
  }
  await admin.from("audit_log").insert({ actor_id: profile.id, action: "course_stopped_early", target_table: "prescriptions", target_id: prescriptionId, detail: { hospital_id: p.hospital_id } });
  revalidatePath("/home");
  revalidatePath("/meds");
  return { ok: true };
}
