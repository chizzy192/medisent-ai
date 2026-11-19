import { createAdminClient } from "@/lib/db/admin";
import { NAFDAC_PATTERN } from "@/lib/reminders";

/**
 * Drug registration check (BUILD_PLAN Stage 2). Looks a NAFDAC number up in the demo list.
 * Results: registered · not_found · mismatch (number belongs to another drug) · unreadable.
 * Wording in the UI is always "not found in our list — check with your pharmacist"; never "fake".
 * Every check is logged; not_found and mismatch raise a pharmacist alert.
 */
export type DrugCheckResult = "registered" | "not_found" | "mismatch" | "unreadable";
export type DrugCheck = { result: DrugCheckResult; drugId: string | null; listedName: string | null; listedStrength: string | null; manufacturer: string | null; nafdacNo: string | null };

export function normaliseNafdac(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toUpperCase().replace(/^NAFDAC\s*(REG\.?\s*)?(NO\.?:?)?\s*/i, "").replace(/\s+/g, "").replace(/[–—]/g, "-");
  return v || null;
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9/]/g, "");

export async function checkDrug(args: { nafdacNo: string | null; drugName: string; strength: string | null }): Promise<DrugCheck> {
  const nafdacNo = normaliseNafdac(args.nafdacNo);
  const base = { drugId: null, listedName: null, listedStrength: null, manufacturer: null, nafdacNo };
  if (!nafdacNo) return { ...base, result: "unreadable" };
  if (!NAFDAC_PATTERN.test(nafdacNo)) return { ...base, result: "unreadable" };

  const admin = createAdminClient();
  const { data } = await admin.from("drugs").select("id,name,strength,manufacturer,nafdac_listed").ilike("nafdac_no", nafdacNo).maybeSingle();
  if (!data || !data.nafdac_listed) return { ...base, result: "not_found" };

  const nameMatches = norm(data.name) === norm(args.drugName) || norm(args.drugName).includes(norm(data.name)) || norm(data.name).includes(norm(args.drugName));
  const strengthMatches = !args.strength || !data.strength || norm(data.strength) === norm(args.strength);
  return {
    drugId: data.id,
    listedName: data.name,
    listedStrength: data.strength,
    manufacturer: data.manufacturer,
    nafdacNo,
    result: nameMatches && strengthMatches ? "registered" : "mismatch",
  };
}

/** Writes the drug_checks row and, for not_found / mismatch, the pharmacist alert. */
export async function recordDrugCheck(args: {
  patientId: string;
  hospitalId: string | null;
  prescriptionId: string | null;
  scannedName: string;
  check: DrugCheck;
}): Promise<void> {
  const admin = createAdminClient();
  // The same number is logged once per 10 minutes: the live check on the confirm screen, the
  // scan route and the final save all share one row and one pharmacist alert.
  if (args.check.nafdacNo) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await admin.from("drug_checks").select("id,prescription_id").eq("patient_id", args.patientId).eq("nafdac_no", args.check.nafdacNo).gte("checked_at", since).limit(1).maybeSingle();
    if (recent) {
      if (args.prescriptionId && !recent.prescription_id) await admin.from("drug_checks").update({ prescription_id: args.prescriptionId }).eq("id", recent.id);
      return;
    }
  }
  await admin.from("drug_checks").insert({
    patient_id: args.patientId,
    prescription_id: args.prescriptionId,
    drug_id: args.check.drugId,
    scanned_name: args.scannedName,
    nafdac_no: args.check.nafdacNo,
    result: args.check.result,
  });
  if ((args.check.result === "not_found" || args.check.result === "mismatch") && args.hospitalId) {
    const listed = [args.check.listedName, args.check.listedStrength].filter(Boolean).join(" ");
    const detail =
      args.check.result === "not_found"
        ? `NAFDAC number ${args.check.nafdacNo} on "${args.scannedName}" was not found in the registration list. Patient was asked to show the pack to a pharmacist before taking it.`
        : `Mismatch: NAFDAC number ${args.check.nafdacNo} on "${args.scannedName}" is listed for ${listed}. Patient was asked to show the pack to a pharmacist before taking it.`;
    await admin.from("alerts").insert({ patient_id: args.patientId, hospital_id: args.hospitalId, type: "drug_not_found", detail });
  }
}
