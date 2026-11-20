"use server";

import { revalidatePath } from "next/cache";
import { requireRole, staffRoles } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";

/** Staff: mark an alert of their hospital as handled. */
export async function handleAlert(formData: FormData): Promise<void> {
  const { profile } = await requireRole(staffRoles);
  const id = String(formData.get("id") ?? "");
  if (!id || !profile.hospital_id) return;
  const admin = createAdminClient();
  await admin.from("alerts").update({ status: "handled", handled_by: profile.id, handled_at: new Date().toISOString() }).eq("id", id).eq("hospital_id", profile.hospital_id);
  await admin.from("audit_log").insert({ actor_id: profile.id, action: "alert_handled", target_table: "alerts", target_id: id, detail: null });
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}
