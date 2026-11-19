"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/db/admin";
import { platformRoles, requireRole } from "@/lib/auth/dal";
import { sendSms } from "@/lib/sms";
import { brand } from "@/config/brand";

/** Platform admin: approve or reject a registered hospital (BUILD_PLAN Stage 1). */
export type ReviewState = { error?: string } | undefined;

export async function reviewHospital(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const { profile } = await requireRole(platformRoles);
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "approved" ? "approved" : formData.get("decision") === "reopen" ? "pending" : "rejected";
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  if (!id) return;
  // A rejection must say why: the note goes to the hospital.
  if (decision === "rejected" && !note) return { error: "noteRequired" };

  const admin = createAdminClient();
  const { data: hospital } = await admin.from("hospitals").select("name,contact_phone").eq("id", id).maybeSingle();
  await admin
    .from("hospitals")
    .update({ status: decision, review_note: note, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (hospital?.contact_phone && decision !== "pending") {
    const { data: adminRow } = await admin.from("staff_roster").select("staff_id").eq("hospital_id", id).eq("role", "hospital_admin").limit(1).maybeSingle();
    const text =
      decision === "approved"
        ? `${brand.name}: ${hospital.name} is approved. Sign up as hospital admin with staff ID ${adminRow?.staff_id ?? ""} at ${brand.appUrl}/signup`
        : `${brand.name}: ${hospital.name} was not approved. ${note}`;
    await sendSms(hospital.contact_phone, text);
  }
  await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: `hospital_${decision}`,
    target_table: "hospitals",
    target_id: id,
    detail: { note },
  });
  revalidatePath("/approve-hospitals");
  return undefined;
}

/** Signed URL for a licence file (private bucket), valid for ten minutes. */
export async function licenceLink(path: string): Promise<string | null> {
  await requireRole(platformRoles);
  const admin = createAdminClient();
  const { data } = await admin.storage.from("hospital-licences").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
