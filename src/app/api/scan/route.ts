import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { readPack, type PackRead } from "@/lib/ai/scan";
import { createAdminClient } from "@/lib/db/admin";
import type { PrescriptionStatus } from "@/lib/db/types";
import { checkDrug, recordDrugCheck, type DrugCheck } from "@/lib/drugcheck";
import { samePrescription, suggestFromPack, type FormularyDrug } from "@/lib/formulary";
import { lagosDate } from "@/lib/reminders";
import { currentMeds, findInteractions, type InteractionHit } from "@/lib/interactions";

/**
 * POST multipart { image } → { pack, check, formulary, matches, expired } (BUILD_PLAN section 5).
 * The reader returns printed fields only (never a dose). The NAFDAC number is checked against
 * the registration list, the formulary suggests the matching entry, and for a patient the pack
 * is matched against their own prescriptions so the Scan tab can answer "Is this my drug?"
 * with the dose FROM THE RECORD. Nothing is saved here.
 */
export type MyMedMatch = {
  id: string;
  drug_name: string;
  strength: string | null;
  dose: string | null;
  frequency_per_day: number;
  instructions_plain: string | null;
  status: PrescriptionStatus;
  times: string[];
};

export type ScanResponse = {
  pack: PackRead;
  check: DrugCheck | null;
  formulary: FormularyDrug[];
  /** The patient's own prescriptions that this pack belongs to (verified or edited first). */
  matches: MyMedMatch[];
  /** The printed expiry date is before today (Lagos). */
  expired: boolean;
  /** Interactions between this pack and the patient's other medicines (table rules only). */
  interactions: InteractionHit[];
  needsRetry: boolean;
};

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.profile.verified_status !== "verified" || session.profile.role === "platform_admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "image_required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "image_too_big" }, { status: 413 });
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return NextResponse.json({ error: "image_type" }, { status: 415 });

  try {
    const pack = await readPack(new Uint8Array(await file.arrayBuffer()), file.type === "image/heic" || file.type === "image/heif" ? "image/jpeg" : file.type);
    const name = pack.drug_name.value;
    const check = pack.nafdac_no.value ? await checkDrug({ nafdacNo: pack.nafdac_no.value, drugName: name ?? "", strength: pack.strength.value }) : null;
    const formulary = await suggestFromPack({ name, strength: pack.strength.value, nafdac: pack.nafdac_no.value, barcode: pack.barcode.value });

    let matches: MyMedMatch[] = [];
    let interactions: InteractionHit[] = [];
    if (session.profile.role === "patient") {
      const admin = createAdminClient();
      const [{ data: meds }, { data: rems }] = await Promise.all([
        admin.from("prescriptions").select("id,drug_id,drug_name,strength,dose,frequency_per_day,instructions_plain,status").eq("patient_id", session.profile.id).eq("active", true).neq("status", "rejected"),
        admin.from("reminders").select("prescription_id,time_of_day").eq("patient_id", session.profile.id).eq("active", true).order("time_of_day"),
      ]);
      const times = new Map<string, string[]>();
      for (const r of rems ?? []) times.set(r.prescription_id, [...(times.get(r.prescription_id) ?? []), String(r.time_of_day).slice(0, 5)]);
      const packIds = new Set([check?.drugId, ...formulary.map((d) => d.id)].filter(Boolean) as string[]);
      matches = (meds ?? [])
        .filter((m) => samePrescription({ drugId: m.drug_id && packIds.has(m.drug_id) ? m.drug_id : null, name, strength: pack.strength.value }, m))
        .sort((a, b) => Number(b.status !== "pending") - Number(a.status !== "pending"))
        .map((m) => ({ id: m.id, drug_name: m.drug_name, strength: m.strength, dose: m.dose, frequency_per_day: m.frequency_per_day, instructions_plain: m.instructions_plain, status: m.status as PrescriptionStatus, times: times.get(m.id) ?? [] }));
      const candidate = { id: matches[0]?.id ?? null, generic: formulary[0]?.generic_name ?? null, name: name ?? formulary[0]?.name ?? "" };
      const others = (await currentMeds(session.profile.id)).filter((m) => !matches.some((x) => x.id === m.id));
      interactions = name ? await findInteractions(candidate, others) : [];
      // Every check is logged and a not-found / mismatch alerts the pharmacist even if the patient stops here.
      if (check && (check.result === "not_found" || check.result === "mismatch")) {
        await recordDrugCheck({ patientId: session.profile.id, hospitalId: session.profile.hospital_id, prescriptionId: matches[0]?.id ?? null, scannedName: name ?? "", check });
      }
    }

    const expired = Boolean(pack.expiry_date.value && pack.expiry_date.value < lagosDate());
    const response: ScanResponse = { pack, check, formulary, matches, expired, interactions, needsRetry: !name || pack.drug_name.confidence < 0.6 };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[scan]", error);
    return NextResponse.json({ error: "reader_failed" }, { status: 502 });
  }
}
