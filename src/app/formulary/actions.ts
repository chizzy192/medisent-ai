"use server";

import { getSession } from "@/lib/auth/dal";
import { getDrug, searchFormulary, type FormularyDrug } from "@/lib/formulary";
import { checkAgainstCurrent, type InteractionHit } from "@/lib/interactions";
import { patientOfHospital } from "@/lib/intake";

/** Formulary search for the drug picker (patients adding a medicine, staff dispensing). */
/**
 * Interactions between a formulary drug and a patient's current medicines, shown while the
 * drug is being picked. Patients check their own list; staff name a patient of their hospital.
 */
export async function previewInteractions(drugId: string, patientId?: string): Promise<InteractionHit[]> {
  const session = await getSession();
  if (!session || session.profile.verified_status !== "verified") return [];
  const drug = await getDrug(String(drugId ?? ""));
  if (!drug) return [];
  let target = session.profile.role === "patient" ? session.profile.id : null;
  if (!target && patientId) target = (await patientOfHospital(session, String(patientId)))?.id ?? null;
  if (!target) return [];
  return checkAgainstCurrent(target, { generic: drug.generic_name, name: drug.name });
}

export async function findDrugs(query: string): Promise<FormularyDrug[]> {
  const session = await getSession();
  if (!session || session.profile.verified_status !== "verified") return [];
  return searchFormulary(String(query ?? "").slice(0, 80));
}
