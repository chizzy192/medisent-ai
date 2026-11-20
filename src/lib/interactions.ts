import { createAdminClient } from "@/lib/db/admin";

/**
 * Drug interaction warnings (BUILD_PLAN section 5). The rules are the `interactions` table and
 * nothing else: generic-name or class pairs with a severity, a plain-English message and the
 * advice; matching is exact on normalised generic parts and classes (src/lib/drug-match.ts).
 * The AI never invents an interaction. A check runs when a pharmacist dispenses, a patient adds
 * a medicine, a pharmacist verifies, and on "Is this my drug?" (the pack vs current medicines).
 */
import { matchRules, type InteractionHit, type MedRef, type Rule, type Severity } from "@/lib/drug-match";
export type { InteractionHit, MedRef, Severity };

let cache: { at: number; rules: Rule[] } | null = null;
async function rules(): Promise<Rule[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.rules;
  const { data } = await createAdminClient().from("interactions").select("drug_a_generic,drug_b_generic,severity,message,advice");
  cache = { at: Date.now(), rules: (data ?? []) as Rule[] };
  return cache.rules;
}

/** Interactions between one medicine and a list of others (never the same prescription). */
export async function findInteractions(candidate: MedRef, others: MedRef[]): Promise<InteractionHit[]> {
  return matchRules(candidate, others, await rules());
}

/** The patient's current medicines (active, not rejected) as MedRefs. */
export async function currentMeds(patientId: string): Promise<MedRef[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("prescriptions").select("id,drug_name,drug_id,drugs(generic_name)").eq("patient_id", patientId).eq("active", true).neq("status", "rejected");
  return (data ?? []).map((p) => {
    const d = p.drugs as unknown as { generic_name: string | null } | { generic_name: string | null }[] | null;
    const generic = Array.isArray(d) ? (d[0]?.generic_name ?? null) : (d?.generic_name ?? null);
    return { id: p.id, generic, name: p.drug_name };
  });
}

/** Check a medicine against the patient's current list. */
export async function checkAgainstCurrent(patientId: string, candidate: MedRef): Promise<InteractionHit[]> {
  return findInteractions(candidate, await currentMeds(patientId));
}

/**
 * One open pharmacist alert per patient and pair. `detail` is the plain sentence the dashboard
 * shows; nothing is sent to the model.
 */
export async function raiseInteractionAlerts(args: { patientId: string; hospitalId: string | null; prescriptionId: string | null; candidateName: string; hits: InteractionHit[] }): Promise<void> {
  if (!args.hospitalId || !args.hits.length) return;
  const admin = createAdminClient();
  const { data: open } = await admin.from("alerts").select("detail").eq("patient_id", args.patientId).eq("type", "interaction").eq("status", "open");
  const existing = new Set((open ?? []).map((a) => String(a.detail)));
  const rows = args.hits
    .map((h) => ({
      patient_id: args.patientId,
      hospital_id: args.hospitalId,
      prescription_id: args.prescriptionId,
      type: "interaction",
      detail: `${h.severity === "major" ? "Major" : "Moderate"} interaction: ${args.candidateName} with ${h.withName}. ${h.message}`,
    }))
    .filter((r) => !existing.has(r.detail));
  if (rows.length) {
    const { error } = await admin.from("alerts").insert(rows);
    if (error) throw new Error(`alerts: ${error.message}`);
  }
}

export function hasMajor(hits: InteractionHit[]): boolean {
  return hits.some((h) => h.severity === "major");
}
