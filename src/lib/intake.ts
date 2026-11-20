import type { Session } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import type { Role } from "@/lib/db/types";

/** Who may dispense and who may verify patient entries (BUILD_PLAN section 5, intake rule). */
export const dispenserRoles: Role[] = ["pharmacist", "doctor"];
export const verifierRoles: Role[] = ["pharmacist", "doctor"];

/** The patient row when it belongs to the staff member's hospital; null otherwise. */
export async function patientOfHospital(session: Session, patientId: string) {
  if (!patientId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id,full_name,hospital_number,hospital_id,role,phone").eq("id", patientId).maybeSingle();
  if (!data || data.role !== "patient" || !session.profile.hospital_id || data.hospital_id !== session.profile.hospital_id) return null;
  return data;
}
