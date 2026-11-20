import { createAdminClient } from "@/lib/db/admin";

/**
 * Formulary (the `drugs` table): the only place a medicine's name, strength and form may come
 * from. Pharmacists pick from it when dispensing; patients pick from it when adding a medicine
 * (the pack photo only pre-fills the search). Matching is name-first, strength-second.
 */
export type FormularyDrug = { id: string; name: string; generic_name: string | null; strength: string | null; form: string | null; nafdac_no: string | null; manufacturer: string | null; barcode: string | null; course_required: boolean };

export const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9/]/g, "");

export async function searchFormulary(query: string, limit = 12): Promise<FormularyDrug[]> {
  const q = query.trim().slice(0, 80);
  const admin = createAdminClient();
  let req = admin.from("drugs").select("id,name,generic_name,strength,form,nafdac_no,manufacturer,barcode,course_required").eq("nafdac_listed", true).order("name").order("strength").limit(limit);
  if (q) {
    const safe = q.replace(/[%_,()]/g, " ");
    req = req.or(`name.ilike.%${safe}%,generic_name.ilike.%${safe}%`);
  }
  const { data } = await req;
  return (data ?? []) as FormularyDrug[];
}

export async function getDrug(id: string): Promise<FormularyDrug | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("drugs").select("id,name,generic_name,strength,form,nafdac_no,manufacturer,barcode,course_required").eq("id", id).maybeSingle();
  return (data as FormularyDrug | null) ?? null;
}

/**
 * Best formulary candidates for what a pack photo says: a barcode or NAFDAC number is an exact
 * hit; otherwise the first word of the name, ranked by strength match.
 */
export async function suggestFromPack(read: { name: string | null; strength: string | null; nafdac: string | null; barcode: string | null }): Promise<FormularyDrug[]> {
  const admin = createAdminClient();
  const select = "id,name,generic_name,strength,form,nafdac_no,manufacturer,barcode,course_required";
  if (read.barcode) {
    const { data } = await admin.from("drugs").select(select).eq("barcode", read.barcode).limit(3);
    if (data?.length) return data as FormularyDrug[];
  }
  if (read.nafdac) {
    const { data } = await admin.from("drugs").select(select).ilike("nafdac_no", read.nafdac).limit(3);
    if (data?.length) return data as FormularyDrug[];
  }
  const word = (read.name ?? "").split(/[\s\-/(]/).find((w) => w.length >= 4) ?? "";
  if (!word) return [];
  const hits = await searchFormulary(word, 10);
  const s = norm(read.strength);
  return hits.sort((a, b) => Number(s && norm(b.strength) === s) - Number(s && norm(a.strength) === s));
}

/** The same pack vs a saved prescription: same formulary row, or same name and strength. */
export function samePrescription(pack: { drugId?: string | null; name: string | null; strength: string | null }, rx: { drug_id: string | null; drug_name: string; strength: string | null }): boolean {
  if (pack.drugId && rx.drug_id && pack.drugId === rx.drug_id) return true;
  const a = norm(pack.name);
  const b = norm(rx.drug_name);
  if (!a || !b) return false;
  const nameOk = a === b || a.includes(b) || b.includes(a);
  const strengthOk = !pack.strength || !rx.strength || norm(pack.strength) === norm(rx.strength);
  return nameOk && strengthOk;
}
