"use server";

import { patientRoles, requireRole } from "@/lib/auth/dal";
import { checkDrug, recordDrugCheck, type DrugCheck } from "@/lib/drugcheck";

/** Check a typed NAFDAC number against the registration list (Scan tab, "type it instead"). */
export async function checkNafdac(nafdacNo: string, drugName: string, strength: string): Promise<DrugCheck> {
  const { profile } = await requireRole(patientRoles);
  const check = await checkDrug({ nafdacNo: String(nafdacNo).slice(0, 40), drugName: String(drugName).slice(0, 120), strength: String(strength).slice(0, 40) });
  if (check.result === "not_found" || check.result === "mismatch") {
    await recordDrugCheck({ patientId: profile.id, hospitalId: profile.hospital_id, prescriptionId: null, scannedName: String(drugName).slice(0, 120), check });
  }
  return check;
}
