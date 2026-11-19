import type { PillShape } from "@/components/PillIcon";
import type { Locale } from "@/config/locales";
import { createAdminClient } from "@/lib/db/admin";
import type { WithFood } from "@/lib/ai/scan";
import { checkDrug, normaliseNafdac, recordDrugCheck, type DrugCheck } from "@/lib/drugcheck";
import { buildInstruction } from "@/lib/instructions";
import { defaultTimes, lagosDate } from "@/lib/reminders";

/**
 * Saving a confirmed prescription (patient scan or staff entry): prescription row, reminders
 * (one per time of day), the refill row from the quantity dispensed, the drug registration
 * check with its alert, and the plain-language instruction in the patient's language.
 */
export type NewPrescription = {
  patientId: string;
  hospitalId: string | null;
  createdBy: string;
  source: "scan" | "staff";
  language: Locale;
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
  image_url: string | null;
  confirmed_by_patient: boolean;
};

export type SavedPrescription = { id: string; instruction: string; check: DrugCheck | null; runsOutOn: string | null };

export async function createPrescription(p: NewPrescription): Promise<SavedPrescription> {
  const admin = createAdminClient();
  const times = p.times.length ? p.times : defaultTimes(p.frequency_per_day);
  const instruction = buildInstruction({ dose: p.dose, form: p.form, frequency_per_day: times.length, duration_days: p.duration_days, with_food: p.with_food, times }, p.language);
  const nafdac = normaliseNafdac(p.nafdac_no);
  const check = nafdac ? await checkDrug({ nafdacNo: nafdac, drugName: p.drug_name, strength: p.strength }) : null;

  const { data: row, error } = await admin
    .from("prescriptions")
    .insert({
      patient_id: p.patientId,
      hospital_id: p.hospitalId,
      drug_id: check?.drugId ?? null,
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
      image_url: p.image_url,
      confirmed_by_patient: p.confirmed_by_patient,
      created_by: p.createdBy,
      nafdac_no: nafdac,
      manufacturer: p.manufacturer,
      check_result: check?.result ?? null,
      warnings: p.warnings,
      started_on: lagosDate(),
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(error?.message ?? "prescription insert failed");

  // Everything after the prescription row either succeeds or the row is removed again, so the
  // patient is never told "reminders set" without reminders, and a retry never duplicates.
  try {
    const { error: remError } = await admin.from("reminders").insert(times.map((time) => ({ prescription_id: row.id, patient_id: p.patientId, time_of_day: time, channel: "app" })));
    if (remError) throw new Error(remError.message);

    let runsOutOn: string | null = null;
    const units = p.units_per_dose || 1;
    const coursePack = p.duration_days ? p.duration_days * times.length * units : null;
    // A fixed course (e.g. 5 days of antibiotics) with enough tablets needs no refill reminder.
    const finiteCourseCovered = coursePack !== null && p.quantity_dispensed !== null && p.quantity_dispensed >= coursePack;
    if (p.quantity_dispensed && p.quantity_dispensed > 0 && !finiteCourseCovered) {
      const { data: refill, error: refError } = await admin
        .from("refills")
        .insert({ prescription_id: row.id, patient_id: p.patientId, quantity_dispensed: p.quantity_dispensed, doses_per_day: times.length, units_per_dose: units, dispensed_on: lagosDate() })
        .select("runs_out_on")
        .single();
      if (refError) throw new Error(refError.message);
      runsOutOn = refill?.runs_out_on ?? null;
    }

    if (check) await recordDrugCheck({ patientId: p.patientId, hospitalId: p.hospitalId, prescriptionId: row.id, scannedName: p.drug_name, check });
    await admin.from("audit_log").insert({ actor_id: p.createdBy, action: "prescription_created", target_table: "prescriptions", target_id: row.id, detail: { source: p.source } });
    return { id: row.id, instruction, check, runsOutOn };
  } catch (error) {
    await admin.from("prescriptions").delete().eq("id", row.id);
    throw error;
  }
}

