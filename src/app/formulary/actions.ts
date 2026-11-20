"use server";

import { getSession } from "@/lib/auth/dal";
import { searchFormulary, type FormularyDrug } from "@/lib/formulary";

/** Formulary search for the drug picker (patients adding a medicine, staff dispensing). */
export async function findDrugs(query: string): Promise<FormularyDrug[]> {
  const session = await getSession();
  if (!session || session.profile.verified_status !== "verified") return [];
  return searchFormulary(String(query ?? "").slice(0, 80));
}
