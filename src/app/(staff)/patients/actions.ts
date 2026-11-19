"use server";

import { revalidatePath } from "next/cache";
import type { PillShape } from "@/components/PillIcon";
import { requireRole, staffRoles } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import type { WithFood } from "@/lib/ai/scan";
import { createPrescription } from "@/lib/prescriptions";
import { defaultTimes } from "@/lib/reminders";
import type { Locale } from "@/config/locales";

/**
 * Staff add a prescription for one of their hospital's patients (BUILD_PLAN Stage 2).
 * Same save path as the patient's scan; `confirmed_by_patient` stays false until the patient
 * confirms it on their phone. Error strings are keys under `staffPrescription.errors`.
 */
export type AddState = { error?: string; fieldErrors?: Record<string, string>; savedId?: string; instruction?: string } | undefined;
const field = (fd: FormData, n: string) => String(fd.get(n) ?? "").trim();
const shapes: PillShape[] = ["round", "capsule", "oval", "inhaler", "liquid", "injection"];

export async function addPrescription(_prev: AddState, formData: FormData): Promise<AddState> {
  const { profile } = await requireRole(staffRoles);
  const patientId = field(formData, "patientId");
  const admin = createAdminClient();
  const { data: patient } = await admin.from("profiles").select("id,hospital_id,language,role").eq("id", patientId).maybeSingle();
  if (!patient || patient.role !== "patient" || !profile.hospital_id || patient.hospital_id !== profile.hospital_id) return { error: "notYourPatient" };

  const fieldErrors: Record<string, string> = {};
  const drug_name = field(formData, "drugName");
  const dose = field(formData, "dose");
  const frequency = Math.min(6, Math.max(1, Number(field(formData, "frequency")) || 0));
  if (!drug_name) fieldErrors.drugName = "nameRequired";
  if (!dose) fieldErrors.dose = "doseRequired";
  if (!frequency) fieldErrors.frequency = "frequencyRequired";
  const quantity = Number(field(formData, "quantity")) || null;
  const duration = Number(field(formData, "duration")) || null;
  const withFood = (["before", "after", "with", "any"].includes(field(formData, "withFood")) ? field(formData, "withFood") : "any") as WithFood;
  const shape = (shapes.includes(field(formData, "pillShape") as PillShape) ? field(formData, "pillShape") : "round") as PillShape;
  const colour = /^#[0-9A-Fa-f]{6}$/.test(field(formData, "pillColor")) ? field(formData, "pillColor").toUpperCase() : "#FFFFFF";
  const times = formData.getAll("times").map(String).filter((t) => /^\d{2}:\d{2}$/.test(t));
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  try {
    const saved = await createPrescription({
      patientId: patient.id,
      hospitalId: profile.hospital_id,
      createdBy: profile.id,
      source: "staff",
      language: patient.language as Locale,
      drug_name,
      strength: field(formData, "strength"),
      form: field(formData, "form"),
      dose,
      frequency_per_day: frequency,
      duration_days: duration,
      with_food: withFood,
      times: times.length ? times : defaultTimes(frequency),
      pill_shape: shape,
      pill_color: colour,
      quantity_dispensed: quantity,
      units_per_dose: Number(dose.match(/^(\d+(?:\.\d+)?)/)?.[1] ?? 1) || 1,
      nafdac_no: field(formData, "nafdacNo") || null,
      manufacturer: field(formData, "manufacturer") || null,
      instructions_raw: field(formData, "instructionsRaw"),
      warnings: [],
      image_url: null,
      confirmed_by_patient: false,
    });
    revalidatePath(`/patients/${patient.id}`);
    return { savedId: saved.id, instruction: saved.instruction };
  } catch (error) {
    console.error("[staff prescription]", error);
    return { error: "server" };
  }
}
