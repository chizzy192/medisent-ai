"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { PillShape } from "@/components/PillIcon";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import { getDrug } from "@/lib/formulary";
import { cleanDosing, unitsFromDose } from "@/lib/dosing";
import { checkAgainstCurrent, raiseInteractionAlerts, type InteractionHit } from "@/lib/interactions";
import { createPrescription, type SavedPrescription } from "@/lib/prescriptions";

/**
 * Patient adds a medicine themselves (BUILD_PLAN "Patient self-add"): pack photo (required),
 * prescription photo (optional), the formulary row they picked, and the dose / frequency /
 * duration they were told. Saved as source 'self', status 'pending': reminders run, labelled
 * "Not checked yet", until a pharmacist approves, edits or rejects it. The AI pre-fill is kept
 * beside the entry so the pharmacist sees both.
 */
export type AddResult = { ok: true; saved: SavedPrescription; interactions: InteractionHit[] } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const shapes: PillShape[] = ["round", "capsule", "oval", "inhaler", "liquid", "injection"];
const MAX_BYTES = 10 * 1024 * 1024;

async function upload(admin: ReturnType<typeof createAdminClient>, patientId: string, file: File | null, kind: "pack" | "rx"): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("photo_invalid");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${patientId}/${randomUUID()}-${kind}.${ext}`;
  const { error } = await admin.storage.from("med-photos").upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) throw new Error(`upload: ${error.message}`);
  return path;
}

export async function addMyMedicine(formData: FormData): Promise<AddResult> {
  const { profile } = await requireRole(patientRoles);
  const str = (n: string, max: number) => String(formData.get(n) ?? "").trim().slice(0, max);
  try {
    const drugId = str("drugId", 40);
    const drug = drugId ? await getDrug(drugId) : null;
    if (!drug) return { ok: false, error: "drugRequired", fieldErrors: { drug: "drugRequired" } };

    const pack = formData.get("pack");
    if (!(pack instanceof File) || pack.size === 0) return { ok: false, error: "packRequired", fieldErrors: { pack: "packRequired" } };
    const rx = formData.get("rx");

    const { value, errors } = cleanDosing({
      dose: str("dose", 40),
      frequency: str("frequency", 2),
      duration: str("duration", 4),
      withFood: str("withFood", 10),
      times: formData.getAll("times").map(String),
      quantity: str("quantity", 5),
    });
    if (Object.keys(errors).length) return { ok: false, error: Object.values(errors)[0], fieldErrors: errors };

    let aiPrefill: unknown = null;
    try {
      aiPrefill = JSON.parse(str("aiPrefill", 20_000) || "null");
    } catch {
      aiPrefill = null;
    }
    const read = (aiPrefill ?? {}) as { pack?: { nafdac_no?: { value: string | null }; manufacturer?: { value: string | null }; expiry_date?: { value: string | null }; batch_no?: { value: string | null } } };

    // Checked before the row exists so the new medicine is not compared with itself.
    const interactions = await checkAgainstCurrent(profile.id, { generic: drug.generic_name, name: drug.name });
    const admin = createAdminClient();
    const packPath = await upload(admin, profile.id, pack, "pack");
    const rxPath = await upload(admin, profile.id, rx instanceof File ? rx : null, "rx");

    const saved = await createPrescription({
      patientId: profile.id,
      hospitalId: profile.hospital_id,
      createdBy: profile.id,
      source: "self",
      drug_id: drug.id,
      drug_name: drug.name,
      strength: drug.strength ?? "",
      form: drug.form ?? "",
      dose: value.dose,
      frequency_per_day: value.frequency_per_day,
      duration_days: value.duration_days,
      with_food: value.with_food,
      times: value.times,
      pill_shape: shapes.includes(str("pillShape", 12) as PillShape) ? (str("pillShape", 12) as PillShape) : "round",
      pill_color: /^#[0-9A-Fa-f]{6}$/.test(str("pillColor", 7)) ? str("pillColor", 7).toUpperCase() : "#FFFFFF",
      quantity_dispensed: value.quantity,
      units_per_dose: unitsFromDose(value.dose),
      nafdac_no: read.pack?.nafdac_no?.value ?? drug.nafdac_no,
      manufacturer: read.pack?.manufacturer?.value ?? drug.manufacturer,
      instructions_raw: str("asTold", 300),
      warnings: [],
      pack_photo_path: packPath,
      rx_photo_path: rxPath,
      ai_prefill: aiPrefill,
      expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(read.pack?.expiry_date?.value ?? "") ? read.pack!.expiry_date!.value : null,
      batch_no: read.pack?.batch_no?.value ?? null,
      course_required: drug.course_required,
    });
    await raiseInteractionAlerts({ patientId: profile.id, hospitalId: profile.hospital_id, prescriptionId: saved.id, candidateName: drug.name, hits: interactions });
    revalidatePath("/home");
    revalidatePath("/meds");
    return { ok: true, saved, interactions };
  } catch (error) {
    console.error("[add medicine]", error);
    return { ok: false, error: error instanceof Error && error.message === "photo_invalid" ? "photoInvalid" : "server" };
  }
}
