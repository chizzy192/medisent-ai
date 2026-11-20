"use server";

import { revalidatePath } from "next/cache";
import type { PillShape } from "@/components/PillIcon";
import { requireRole } from "@/lib/auth/dal";
import { getDrug } from "@/lib/formulary";
import { dispenserRoles, patientOfHospital } from "@/lib/intake";
import { cleanDosing, unitsFromDose } from "@/lib/dosing";
import { createAdminClient } from "@/lib/db/admin";
import { checkAgainstCurrent, hasMajor, raiseInteractionAlerts, type InteractionHit } from "@/lib/interactions";
import { createPrescription } from "@/lib/prescriptions";

/**
 * Pharmacist / doctor dispensing (BUILD_PLAN "Pharmacist dispensing"): find the patient, pick
 * the drug from the formulary, type dose / frequency / duration. Saved as source 'hospital',
 * status 'verified', verified_by = the dispenser. Error strings are keys under `dispense.errors`.
 */
export type DispenseState = { error?: string; fieldErrors?: Record<string, string>; savedId?: string; instruction?: string; patientName?: string; interactions?: InteractionHit[] } | undefined;

const field = (fd: FormData, n: string) => String(fd.get(n) ?? "").trim();
const shapes: PillShape[] = ["round", "capsule", "oval", "inhaler", "liquid", "injection"];

export async function dispense(_prev: DispenseState, formData: FormData): Promise<DispenseState> {
  const session = await requireRole(dispenserRoles);
  const patient = await patientOfHospital(session, field(formData, "patientId"));
  if (!patient) return { error: "notYourPatient" };

  const drug = await getDrug(field(formData, "drugId"));
  if (!drug) return { fieldErrors: { drug: "drugRequired" } };
  const { value, errors } = cleanDosing({
    dose: field(formData, "dose"),
    frequency: field(formData, "frequency"),
    duration: field(formData, "duration"),
    withFood: field(formData, "withFood"),
    times: formData.getAll("times").map(String),
    quantity: field(formData, "quantity"),
  });
  if (Object.keys(errors).length) return { fieldErrors: errors };

  // Interaction rules (table only). A major one needs the pharmacist's explicit review tick.
  const interactions = await checkAgainstCurrent(patient.id, { generic: drug.generic_name, name: drug.name });
  const reviewed = field(formData, "reviewed") === "on";
  if (hasMajor(interactions) && !reviewed) return { error: "reviewRequired", interactions };

  try {
    const saved = await createPrescription({
      patientId: patient.id,
      hospitalId: session.profile.hospital_id,
      createdBy: session.profile.id,
      source: "hospital",
      drug_id: drug.id,
      drug_name: drug.name,
      strength: drug.strength ?? "",
      form: drug.form ?? "",
      dose: value.dose,
      frequency_per_day: value.frequency_per_day,
      duration_days: value.duration_days,
      with_food: value.with_food,
      times: value.times,
      pill_shape: shapes.includes(field(formData, "pillShape") as PillShape) ? (field(formData, "pillShape") as PillShape) : "round",
      pill_color: /^#[0-9A-Fa-f]{6}$/.test(field(formData, "pillColor")) ? field(formData, "pillColor").toUpperCase() : "#FFFFFF",
      quantity_dispensed: value.quantity,
      units_per_dose: unitsFromDose(value.dose),
      nafdac_no: drug.nafdac_no,
      manufacturer: drug.manufacturer,
      instructions_raw: field(formData, "instructionsRaw").slice(0, 300),
      warnings: [],
      pack_photo_path: null,
      rx_photo_path: null,
      ai_prefill: null,
      expiry_date: null,
      batch_no: field(formData, "batchNo").slice(0, 40) || null,
      course_required: drug.course_required,
    });
    if (interactions.length) {
      await raiseInteractionAlerts({ patientId: patient.id, hospitalId: session.profile.hospital_id, prescriptionId: saved.id, candidateName: drug.name, hits: interactions });
      if (reviewed) {
        const admin = createAdminClient();
        await admin.from("prescriptions").update({ interaction_reviewed_by: session.profile.id, interaction_reviewed_at: new Date().toISOString() }).eq("id", saved.id);
        await admin.from("audit_log").insert({ actor_id: session.profile.id, action: "interaction_reviewed", target_table: "prescriptions", target_id: saved.id, detail: { patient_id: patient.id, pairs: interactions.map((h) => ({ severity: h.severity, with: h.withName, pair: h.pair })) } });
      }
    }
    revalidatePath(`/patients/${patient.id}`);
    revalidatePath("/dispense");
    return { savedId: saved.id, instruction: saved.instruction, patientName: patient.full_name, interactions };
  } catch (error) {
    console.error("[dispense]", error);
    return { error: "server" };
  }
}
