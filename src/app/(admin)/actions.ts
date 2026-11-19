"use server";

import { revalidatePath } from "next/cache";
import { parseCsv } from "@/lib/csv";
import { validateRows } from "@/lib/roster";
import { createAdminClient } from "@/lib/db/admin";
import { patientColumns, staffColumns } from "@/lib/db/types";
import { adminRoles, requireRole } from "@/lib/auth/dal";

/**
 * Hospital admin: roster and registry CSV uploads (preview happens in the browser; the server
 * parses and validates again before saving) and verification management. Every action checks
 * the caller is a verified hospital_admin and only touches their own hospital.
 */
export type { RowIssue, UploadKind } from "@/lib/roster";
import type { RowIssue, UploadKind } from "@/lib/roster";
export type UploadState =
  | { step: "idle" }
  | { step: "done"; kind: UploadKind; inserted: number; updated: number }
  | { step: "error"; kind: UploadKind; error?: string; issues?: RowIssue[] };



export async function uploadCsv(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const kind = (formData.get("kind") === "patients" ? "patients" : "staff") as UploadKind;
  const { profile } = await requireRole(adminRoles);
  if (!profile.hospital_id) return { step: "error", kind, error: "noHospital" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { step: "error", kind, error: "fileRequired" };
  if (file.size > 5 * 1024 * 1024) return { step: "error", kind, error: "fileTooBig" };

  const { headers, rows } = parseCsv(await file.text());
  const required = kind === "staff" ? staffColumns : patientColumns;
  const missing = required.filter((c) => !headers.includes(c));
  if (missing.length) return { step: "error", kind, error: "columnsMissing" };
  if (rows.length === 0) return { step: "error", kind, error: "empty" };
  if (rows.length > 5000) return { step: "error", kind, error: "tooManyRows" };

  const { issues, staff, patients } = validateRows(kind, rows);
  if (issues.length) return { step: "error", kind, error: "rowsInvalid", issues: issues.slice(0, 50) };

  const admin = createAdminClient();
  const table = kind === "staff" ? "staff_roster" : "patient_registry";
  const keyCol = kind === "staff" ? "staff_id" : "hospital_number";
  const keys = (kind === "staff" ? staff.map((s) => s.staff_id) : patients.map((p) => p.hospital_number));
  let existingCount = 0;
  for (let i = 0; i < keys.length; i += 500) {
    const { data: existing } = await admin.from(table).select(keyCol).eq("hospital_id", profile.hospital_id).in(keyCol, keys.slice(i, i + 500));
    existingCount += existing?.length ?? 0;
  }

  const payload = (kind === "staff" ? staff : patients).map((r) => ({ ...r, hospital_id: profile.hospital_id }));
  const { error } = await admin.from(table).upsert(payload, { onConflict: `hospital_id,${keyCol}` });
  if (error) return { step: "error", kind, error: "server" };

  await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: `${table}_uploaded`,
    target_table: table,
    target_id: profile.hospital_id,
    detail: { rows: payload.length, updated: existingCount },
  });
  revalidatePath("/roster");
  revalidatePath("/hospital");
  return { step: "done", kind, inserted: payload.length - existingCount, updated: existingCount };
}

/** Lift a three-strike block after checking the person at the records desk. */
export async function unblockAttempt(formData: FormData): Promise<void> {
  const { profile } = await requireRole(adminRoles);
  const id = String(formData.get("id") ?? "");
  if (!id || !profile.hospital_id) return;
  const admin = createAdminClient();
  const { data } = await admin.from("verification_attempts").select("id,hospital_id").eq("id", id).maybeSingle();
  if (!data || data.hospital_id !== profile.hospital_id) return;
  await admin.from("verification_attempts").update({ failed_attempts: 0, blocked_at: null }).eq("id", id);
  await admin.from("alerts").update({ status: "handled", handled_by: profile.id, handled_at: new Date().toISOString() })
    .eq("hospital_id", profile.hospital_id).eq("type", "verification_blocked").eq("status", "open");
  await admin.from("audit_log").insert({ actor_id: profile.id, action: "verification_unblocked", target_table: "verification_attempts", target_id: id });
  revalidatePath("/verifications");
}

/** Block or restore a member of this hospital (e.g. a staff member who left). */
export async function setMemberStatus(formData: FormData): Promise<void> {
  const { profile } = await requireRole(adminRoles);
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "blocked" ? "blocked" : "verified";
  if (!id || !profile.hospital_id || id === profile.id) return;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id,hospital_id,verified_status").eq("id", id).maybeSingle();
  if (!data || data.hospital_id !== profile.hospital_id) return;
  // Only blocked <-> verified. A pending or rejected signup can only become verified by matching the list.
  const allowed = (data.verified_status === "verified" && status === "blocked") || (data.verified_status === "blocked" && status === "verified");
  if (!allowed) return;
  await admin.from("profiles").update({ verified_status: status }).eq("id", id);
  await admin.from("audit_log").insert({ actor_id: profile.id, action: `member_${status}`, target_table: "profiles", target_id: id });
  revalidatePath("/verifications");
}
