import { isValidNigerianPhone, normalizePhone } from "@/lib/db/env";
import { licenceBodies, staffRoles, type LicenceBody, type StaffRole } from "@/lib/db/types";

/**
 * Row validation for the roster and registry CSV uploads. Pure, so the browser preview and
 * the server action run the same checks (the server always re-runs them before saving).
 * Identifiers are upper-cased and trimmed so the unique keys and verify_identity() agree.
 */
export type UploadKind = "staff" | "patients";
export type RowIssue = { row: number; message: string };
export type StaffRow = { staff_id: string; full_name: string; role: StaffRole; licence_body: LicenceBody | null; licence_no: string | null; phone: string | null; email: string | null };
export type PatientRow = { hospital_number: string; full_name: string; phone: string; age: number | null; sex: "M" | "F" | "other" | null };

const clean = (s: string | undefined) => (s ?? "").normalize("NFC").replace(/\s+/g, " ").trim();

export function validateRows(kind: UploadKind, rows: Record<string, string>[]): { issues: RowIssue[]; staff: StaffRow[]; patients: PatientRow[] } {
  const issues: RowIssue[] = [];
  const staff: StaffRow[] = [];
  const patients: PatientRow[] = [];
  const seen = new Set<string>();

  rows.forEach((r, i) => {
    const row = i + 2; // 1-based, after the header
    if (kind === "staff") {
      const staffId = clean(r.staff_id).toUpperCase();
      const role = clean(r.role).toLowerCase().replace(/\s+/g, "_") as StaffRole;
      const body = (clean(r.licence_body).toUpperCase() || null) as LicenceBody | null;
      const phone = normalizePhone(r.phone);
      if (!staffId) issues.push({ row, message: "staffIdMissing" });
      if (!clean(r.full_name)) issues.push({ row, message: "nameMissing" });
      if (!staffRoles.includes(role)) issues.push({ row, message: "roleInvalid" });
      if (body && !licenceBodies.includes(body)) issues.push({ row, message: "licenceBodyInvalid" });
      if (role && role !== "hospital_admin" && (!body || !clean(r.licence_no))) issues.push({ row, message: "licenceMissing" });
      if (clean(r.phone) && !isValidNigerianPhone(phone)) issues.push({ row, message: "phoneInvalid" });
      if (!clean(r.phone) && !clean(r.email)) issues.push({ row, message: "contactMissing" });
      if (staffId && seen.has(staffId)) issues.push({ row, message: "duplicateId" });
      seen.add(staffId);
      staff.push({ staff_id: staffId, full_name: clean(r.full_name), role, licence_body: body, licence_no: clean(r.licence_no).toUpperCase() || null, phone, email: clean(r.email).toLowerCase() || null });
    } else {
      const hospitalNumber = clean(r.hospital_number).toUpperCase();
      const phone = normalizePhone(r.phone);
      const age = clean(r.age) ? Number(clean(r.age)) : null;
      const sexRaw = clean(r.sex).toUpperCase() || null;
      const sex: PatientRow["sex"] = sexRaw === "M" ? "M" : sexRaw === "F" ? "F" : sexRaw === "OTHER" ? "other" : null;
      if (!hospitalNumber) issues.push({ row, message: "hospitalNumberMissing" });
      if (!clean(r.full_name)) issues.push({ row, message: "nameMissing" });
      if (!clean(r.phone)) issues.push({ row, message: "phoneMissing" });
      else if (!isValidNigerianPhone(phone)) issues.push({ row, message: "phoneInvalid" });
      if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130)) issues.push({ row, message: "ageInvalid" });
      if (sexRaw && !sex) issues.push({ row, message: "sexInvalid" });
      if (hospitalNumber && seen.has(hospitalNumber)) issues.push({ row, message: "duplicateId" });
      seen.add(hospitalNumber);
      patients.push({ hospital_number: hospitalNumber, full_name: clean(r.full_name), phone: phone ?? "", age, sex });
    }
  });
  return { issues, staff, patients };
}
