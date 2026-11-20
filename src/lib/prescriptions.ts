import type { PillShape } from "@/components/PillIcon";
import { createAdminClient } from "@/lib/db/admin";
import type { PrescriptionSource, WithFood } from "@/lib/db/types";
export { cleanDosing, unitsFromDose, type DosingInput } from "@/lib/dosing";
import { checkDrug, normaliseNafdac, recordDrugCheck, type DrugCheck } from "@/lib/drugcheck";
import { buildInstruction } from "@/lib/instructions";
import { defaultTimes, lagosDate } from "@/lib/reminders";

/**
 * Saving a prescription (hospital dispensing or a patient's own entry): prescription row,
 * reminders (one per time of day), the refill row from the quantity dispensed, the drug
 * registration check with its alert, and the plain-English instruction. The dose always comes
 * from a person: staff (verified at once) or the patient (pending until a pharmacist checks).
 */
export type NewPrescription = {
  patientId: string;
  hospitalId: string | null;
  createdBy: string;
  source: PrescriptionSource;
  drug_id: string | null;
  drug_name: string;
  strength: string;
  form: string;
  dose: string;
  frequency_per_day: number;
  duration_days: number | null;
  with_food: WithFood;
  times: string[];
  pill_shape: PillShape;
  pill_color: string;
  quantity_dispensed: number | null;
  units_per_dose: number;
  nafdac_no: string | null;
  manufacturer: string | null;
  instructions_raw: string;
  warnings: string[];
  pack_photo_path: string | null;
  rx_photo_path: string | null;
  ai_prefill: unknown | null;
  expiry_date: string | null;
  batch_no: string | null;
};

export type SavedPrescription = { id: string; instruction: string; check: DrugCheck | null; runsOutOn: string | null };

export async function createPrescription(p: NewPrescription): Promise<SavedPrescription> {
  const admin = createAdminClient();
  const times = p.times.length ? p.times : defaultTimes(p.frequency_per_day);
  const instruction = buildInstruction({ dose: p.dose, form: p.form, frequency_per_day: times.length, duration_days: p.duration_days, with_food: p.with_food, times });
  const nafdac = normaliseNafdac(p.nafdac_no);
  const check = nafdac ? await checkDrug({ nafdacNo: nafdac, drugName: p.drug_name, strength: p.strength }) : null;
  // Hospital entries are verified by the person who dispensed them; self entries wait for a pharmacist.
  const verified = p.source === "hospital";

  const { data: row, error } = await admin
    .from("prescriptions")
    .insert({
      patient_id: p.patientId,
      hospital_id: p.hospitalId,
      drug_id: p.drug_id ?? check?.drugId ?? null,
      drug_name: p.drug_name,
      strength: p.strength || null,
      form: p.form || null,
      dose: p.dose,
      frequency_per_day: times.length,
      duration_days: p.duration_days,
      with_food: p.with_food,
      instructions: p.instructions_raw || null,
      instructions_plain: instruction,
      pill_shape: p.pill_shape,
      pill_color: p.pill_color,
      quantity_dispensed: p.quantity_dispensed,
      source: p.source,
      status: verified ? "verified" : "pending",
      verified_by: verified ? p.createdBy : null,
      verified_at: verified ? new Date().toISOString() : null,
      confirmed_by_patient: p.source === "self",
      created_by: p.createdBy,
      nafdac_no: nafdac,
      manufacturer: p.manufacturer,
      check_result: check?.result ?? null,
      warnings: p.warnings,
      pack_photo_path: p.pack_photo_path,
      rx_photo_path: p.rx_photo_path,
      ai_prefill: p.ai_prefill ?? null,
      expiry_date: p.expiry_date,
      batch_no: p.batch_no,
      started_on: lagosDate(),
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(error?.message ?? "prescription insert failed");

  // Everything after the prescription row either succeeds or the row is removed again, so the
  // patient is never told "reminders set" without reminders, and a retry never duplicates.
  try {
    await createReminders(row.id, p.patientId, times);
    const runsOutOn = await createRefill(row.id, p.patientId, p.quantity_dispensed, times.length, p.units_per_dose, p.duration_days);
    if (check) await recordDrugCheck({ patientId: p.patientId, hospitalId: p.hospitalId, prescriptionId: row.id, scannedName: p.drug_name, check });
    const { error: auditError } = await admin.from("audit_log").insert({
      actor_id: p.createdBy,
      action: verified ? "prescription_dispensed" : "prescription_self_added",
      target_table: "prescriptions",
      target_id: row.id,
      detail: { source: p.source, status: verified ? "verified" : "pending", drug_id: p.drug_id, patient_id: p.patientId },
    });
    if (auditError) throw new Error(`audit_log: ${auditError.message}`);
    return { id: row.id, instruction, check, runsOutOn };
  } catch (error) {
    await admin.from("prescriptions").delete().eq("id", row.id);
    throw error;
  }
}

export async function createReminders(prescriptionId: string, patientId: string, times: string[]): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("reminders").insert(times.map((time) => ({ prescription_id: prescriptionId, patient_id: patientId, time_of_day: time, channel: "app" })));
  if (error) throw new Error(error.message);
}

/** A fixed course (e.g. 5 days of antibiotics) with enough tablets needs no refill reminder. */
export async function createRefill(prescriptionId: string, patientId: string, quantity: number | null, dosesPerDay: number, unitsPerDose: number, durationDays: number | null): Promise<string | null> {
  const admin = createAdminClient();
  const units = unitsPerDose || 1;
  const coursePack = durationDays ? durationDays * dosesPerDay * units : null;
  const finiteCourseCovered = coursePack !== null && quantity !== null && quantity >= coursePack;
  if (!quantity || quantity <= 0 || finiteCourseCovered) return null;
  const { data, error } = await admin
    .from("refills")
    .insert({ prescription_id: prescriptionId, patient_id: patientId, quantity_dispensed: quantity, doses_per_day: dosesPerDay, units_per_dose: units, dispensed_on: lagosDate() })
    .select("runs_out_on")
    .single();
  if (error) throw new Error(error.message);
  return data?.runs_out_on ?? null;
}
