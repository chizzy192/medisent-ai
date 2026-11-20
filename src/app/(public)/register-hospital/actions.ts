"use server";

import { createAdminClient } from "@/lib/db/admin";
import { isValidNigerianPhone, normalizePhone } from "@/lib/db/env";
import { isServiceRoleConfigured } from "@/lib/db/secrets";
import { sendSms } from "@/lib/sms";
import { brand } from "@/config/brand";

/**
 * Hospital registration (BUILD_PLAN Stage 1): details, logo, brand colour, CAC number and
 * licence upload → a `pending` hospital plus a hospital_admin roster row for the person who
 * registered, so they can sign up once the platform admin approves.
 * Error strings are keys under `registerHospital.errors`.
 */
export type RegisterState =
  | { step: "form"; error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> }
  | { step: "done"; hospitalName: string; staffId: string };

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const MAX_LOGO = 2 * 1024 * 1024;
const MAX_LICENCE = 10 * 1024 * 1024;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function registerHospital(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const values = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const fieldErrors: Record<string, string> = {};

  const name = field(formData, "name");
  const city = field(formData, "city");
  const state = field(formData, "state");
  const address = field(formData, "address");
  const cacNo = field(formData, "cacNo");
  const brandColor = field(formData, "brandColor").toUpperCase();
  const contactName = field(formData, "contactName");
  const staffId = field(formData, "staffId");
  const contactEmail = field(formData, "contactEmail");
  const contactPhone = normalizePhone(field(formData, "contactPhone"));
  const logo = formData.get("logo");
  const licence = formData.get("licence");

  if (name.length < 3) fieldErrors.name = "nameRequired";
  if (!city) fieldErrors.city = "cityRequired";
  if (!state) fieldErrors.state = "stateRequired";
  if (!cacNo) fieldErrors.cacNo = "cacRequired";
  if (!/^#[0-9A-F]{6}$/.test(brandColor)) fieldErrors.brandColor = "colourInvalid";
  if (!contactName) fieldErrors.contactName = "contactNameRequired";
  if (!staffId) fieldErrors.staffId = "staffIdRequired";
  if (!isValidNigerianPhone(contactPhone)) fieldErrors.contactPhone = "phoneInvalid";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) fieldErrors.contactEmail = "emailInvalid";
  if (logo instanceof File && logo.size > MAX_LOGO) fieldErrors.logo = "logoTooBig";
  if (!(licence instanceof File) || licence.size === 0) fieldErrors.licence = "licenceRequired";
  else if (licence.size > MAX_LICENCE) fieldErrors.licence = "licenceTooBig";
  if (Object.keys(fieldErrors).length) return { step: "form", fieldErrors, values };
  if (!isServiceRoleConfigured()) return { step: "form", error: "notConfigured", values };

  const admin = createAdminClient();
  const base = slugify(name) || "hospital";
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await admin.from("hospitals").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }

  const { data: hospital, error } = await admin
    .from("hospitals")
    .insert({ name, slug, city, state, address, cac_no: cacNo, brand_color: brandColor, contact_name: contactName, contact_phone: contactPhone, contact_email: contactEmail, status: "pending" })
    .select("id")
    .single();
  if (error || !hospital) return { step: "form", error: "server", values };

  const updates: Record<string, string> = {};
  if (logo instanceof File && logo.size > 0) {
    const ext = logo.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${hospital.id}/logo.${ext}`;
    const up = await admin.storage.from("hospital-logos").upload(path, logo, { upsert: true, contentType: logo.type });
    if (!up.error) updates.logo_url = admin.storage.from("hospital-logos").getPublicUrl(path).data.publicUrl;
  }
  if (licence instanceof File) {
    const ext = licence.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${hospital.id}/licence.${ext}`;
    const up = await admin.storage.from("hospital-licences").upload(path, licence, { upsert: true, contentType: licence.type });
    if (!up.error) updates.licence_url = path;
  }
  if (Object.keys(updates).length) await admin.from("hospitals").update(updates).eq("id", hospital.id);

  await admin.from("staff_roster").insert({
    hospital_id: hospital.id,
    staff_id: staffId,
    full_name: contactName,
    role: "hospital_admin",
    phone: contactPhone,
    email: contactEmail,
  });
  await admin.from("audit_log").insert({ action: "hospital_registered", target_table: "hospitals", target_id: hospital.id, detail: { name, cac_no: cacNo } });

  await sendSms(contactPhone!, `${brand.name}: ${name} is sent for review. After approval, sign up as hospital admin with staff ID ${staffId}. We reply within two working days.`);
  return { step: "done", hospitalName: name, staffId };
}
