"use server";

import { revalidatePath } from "next/cache";
import type { PillShape } from "@/components/PillIcon";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import type { WithFood } from "@/lib/ai/scan";
import { checkDrug, recordDrugCheck, type DrugCheck } from "@/lib/drugcheck";
import { createPrescription, type SavedPrescription } from "@/lib/prescriptions";

/** Live check while the patient types or corrects the NAFDAC number on the confirm screen. */
export async function checkNafdac(nafdacNo: string, drugName: string, strength: string): Promise<DrugCheck> {
  const { profile } = await requireRole(patientRoles);
  const check = await checkDrug({ nafdacNo: String(nafdacNo).slice(0, 40), drugName: String(drugName).slice(0, 120), strength: String(strength).slice(0, 40) });
  if (check.result === "not_found" || check.result === "mismatch") {
    await recordDrugCheck({ patientId: profile.id, hospitalId: profile.hospital_id, prescriptionId: null, scannedName: String(drugName).slice(0, 120), check });
  }
  return check;
}

export type ConfirmInput = {
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
  nafdac_no: string | null;
  manufacturer: string | null;
  instructions_raw: string;
  warnings: string[];
};

const shapes: PillShape[] = ["round", "capsule", "oval", "inhaler", "liquid", "injection"];

/** Saves the confirmed scan (BUILD_PLAN Stage 2: "Patient must confirm before saving"). */
export async function saveScannedPrescription(input: ConfirmInput): Promise<{ ok: true; saved: SavedPrescription } | { ok: false; error: string }> {
  const { profile } = await requireRole(patientRoles);
  try {
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const name = str(input.drug_name, 120);
    if (!name) return { ok: false, error: "nameRequired" };
    const dose = str(input.dose, 40);
    if (!dose) return { ok: false, error: "doseRequired" };
    const times = [...new Set((Array.isArray(input.times) ? input.times : []).filter((t) => typeof t === "string" && /^\d{2}:\d{2}$/.test(t)))].sort().slice(0, 6);
    if (!times.length) return { ok: false, error: "timesRequired" };
    const withFood = (["before", "after", "with", "any"] as WithFood[]).includes(input.with_food) ? input.with_food : "any";
    const warnings = (Array.isArray(input.warnings) ? input.warnings : []).filter((w) => typeof w === "string").map((w) => w.slice(0, 200)).slice(0, 10);
    const saved = await createPrescription({
      patientId: profile.id,
      hospitalId: profile.hospital_id,
      createdBy: profile.id,
      source: "scan",
      language: profile.language,
      drug_name: name,
      strength: str(input.strength, 40),
      form: str(input.form, 40),
      dose,
      frequency_per_day: times.length,
      duration_days: typeof input.duration_days === "number" && input.duration_days >= 1 && input.duration_days <= 365 ? Math.round(input.duration_days) : null,
      with_food: withFood,
      times,
      pill_shape: shapes.includes(input.pill_shape) ? input.pill_shape : "round",
      pill_color: /^#[0-9A-Fa-f]{6}$/.test(input.pill_color) ? input.pill_color.toUpperCase() : "#FFFFFF",
      quantity_dispensed: typeof input.quantity_dispensed === "number" && input.quantity_dispensed > 0 ? Math.min(1000, Math.round(input.quantity_dispensed)) : null,
      units_per_dose: Number(dose.match(/^(\d+(?:\.\d+)?)/)?.[1] ?? 1) || 1,
      nafdac_no: str(input.nafdac_no, 40) || null,
      manufacturer: str(input.manufacturer, 120) || null,
      instructions_raw: str(input.instructions_raw, 2000),
      warnings,
      image_url: null,
      confirmed_by_patient: true,
    });
    revalidatePath("/home");
    revalidatePath("/meds");
    return { ok: true, saved };
  } catch (error) {
    console.error("[save prescription]", error);
    return { ok: false, error: "server" };
  }
}
