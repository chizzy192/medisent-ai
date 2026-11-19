import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { CONFIDENCE_FLOOR, KEY_FIELDS, readLabel, shapeForForm, type ScanResult } from "@/lib/ai/scan";
import { checkDrug, recordDrugCheck, type DrugCheck } from "@/lib/drugcheck";
import { defaultTimes } from "@/lib/reminders";

/**
 * POST multipart { image } → { scan, check, suggestion } (BUILD_PLAN section 5).
 * The scanner JSON comes from Gemini; the NAFDAC number (if read) is checked against the
 * demo list straight away so the "Found so far" card can show Registered / Not found.
 * Nothing is saved here: the patient confirms on the next screen first.
 */
export type ScanResponse = {
  scan: ScanResult;
  check: DrugCheck | null;
  suggestion: { pill_shape: ScanResult["pill_shape"]; times: string[] };
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
    const scan = await readLabel(new Uint8Array(await file.arrayBuffer()), file.type === "image/heic" || file.type === "image/heif" ? "image/jpeg" : file.type);
    const check = scan.nafdac_no ? await checkDrug({ nafdacNo: scan.nafdac_no, drugName: scan.drug_name, strength: scan.strength }) : null;
    const missingKey = scan.missing_fields.some((f) => KEY_FIELDS.includes(f));
    const needsRetry = scan.confidence < CONFIDENCE_FLOOR || !scan.drug_name || !scan.dose || missingKey;
    // Every check is logged and a not-found / mismatch alerts the pharmacist even if the patient stops here.
    if (check && (check.result === "not_found" || check.result === "mismatch")) {
      await recordDrugCheck({ patientId: session.profile.id, hospitalId: session.profile.hospital_id, prescriptionId: null, scannedName: scan.drug_name, check });
    }
    const response: ScanResponse = {
      scan,
      check,
      suggestion: { pill_shape: scan.pill_shape ?? shapeForForm(scan.form), times: defaultTimes(scan.frequency_per_day) },
      needsRetry,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[scan]", error);
    return NextResponse.json({ error: "reader_failed" }, { status: 502 });
  }
}
