"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/db/admin";
import { isValidNigerianPhone, normalizePhone, syntheticEmailForPhone } from "@/lib/db/env";
import { isServiceRoleConfigured } from "@/lib/db/secrets";
import { homeForRole, NO_HOSPITAL, type LicenceBody, type Role, type SignupSession, type VerifyResult, licenceBodies, signupRoles } from "@/lib/db/types";
import { checkOtp, consumeOtp, issueOtp, type IssueResult } from "@/lib/auth/otp";
import { createSessionForEmail, ensureAuthUser } from "@/lib/auth/session";
import { isRedirectError, otpSms } from "@/lib/auth/sms-text";

/**
 * Signup and verification (BUILD_PLAN Stage 1, section 4 "Verification").
 * Step 1 matches the roster/registry through verify_identity() and starts a signup session.
 * Step 2 checks the OTP (bound to that session, never to an id from the browser), creates the
 * account and the verified profile, and signs in. Error strings are keys under `signup.errors`.
 */
export type SignupState =
  | { step: "form"; error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> }
  | { step: "otp"; sessionId: string; masked: string; delivery: IssueResult["delivery"]; role: Role; error?: string; triesLeft?: number; cooldownSeconds?: number; resent?: boolean }
  | { step: "rejected"; failedAttempts: number; role: Role }
  | { step: "blocked"; role: Role }
  | { step: "exists"; role: Role };

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const collapse = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

async function startSignup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const values = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const fieldErrors: Record<string, string> = {};

  const hospitalId = field(formData, "hospital");
  const role = field(formData, "role") as Role;
  const consent = formData.get("consent") === "on";

  if (!hospitalId) fieldErrors.hospital = "hospitalRequired";
  if (!signupRoles.includes(role as (typeof signupRoles)[number])) fieldErrors.role = "roleRequired";
  if (hospitalId === NO_HOSPITAL && role !== "patient") fieldErrors.role = "staffNeedHospital";
  if (!consent) fieldErrors.consent = "consentRequired";

  const isStaff = role !== "patient";
  const fullName = collapse(field(formData, "fullName"));
  const staffId = field(formData, "staffId");
  const licenceBody = field(formData, "licenceBody").toUpperCase() as LicenceBody | "";
  const licenceNo = field(formData, "licenceNo");
  const hospitalNumber = field(formData, "hospitalNumber");
  const phone = normalizePhone(field(formData, "phone"));

  if (isStaff) {
    if (!fullName) fieldErrors.fullName = "nameRequired";
    if (!staffId) fieldErrors.staffId = "staffIdRequired";
    if (role !== "hospital_admin") {
      if (!licenceBodies.includes(licenceBody as LicenceBody)) fieldErrors.licenceBody = "licenceBodyRequired";
      if (!licenceNo) fieldErrors.licenceNo = "licenceNoRequired";
    }
  } else {
    if (hospitalId !== NO_HOSPITAL && !hospitalNumber) fieldErrors.hospitalNumber = "hospitalNumberRequired";
    if (hospitalId === NO_HOSPITAL && !fullName) fieldErrors.fullName = "nameRequired";
    if (!isValidNigerianPhone(phone)) fieldErrors.phone = "phoneInvalid";
  }
  if (Object.keys(fieldErrors).length) return { step: "form", fieldErrors, values };
  if (!isServiceRoleConfigured()) return { step: "form", error: "notConfigured", values };

  const admin = createAdminClient();

  // Independent patient: no registry, phone only.
  if (hospitalId === NO_HOSPITAL) {
    const { data: existing } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (existing) return { step: "exists", role: "patient" };
    const session = await admin
      .from("signup_sessions")
      .insert({ hospital_id: null, role: "patient", full_name: fullName, phone, consent_at: new Date().toISOString() })
      .select("id")
      .single();
    if (session.error || !session.data) return { step: "form", error: "server", values };
    const otp = await issueOtp({ target: phone!, purpose: "signup", owner: { signupSessionId: session.data.id }, message: otpSms });
    return { step: "otp", sessionId: session.data.id, masked: otp.maskedTarget, delivery: otp.delivery, role: "patient" };
  }

  // Hospital member: must match the roster or registry.
  const { data: hospital } = await admin.from("hospitals").select("id,status").eq("id", hospitalId).maybeSingle();
  if (!hospital || hospital.status !== "approved") return { step: "form", fieldErrors: { hospital: "hospitalNotApproved" }, values };

  const { data: raw, error } = await admin.rpc("verify_identity", {
    p_hospital_id: hospitalId,
    p_role: role,
    p_identifier: isStaff ? staffId : hospitalNumber,
    p_full_name: isStaff ? fullName : null,
    p_phone: isStaff ? null : phone,
  });
  if (error || !raw) return { step: "form", error: "server", values };
  const result = raw as VerifyResult;

  if (result.result === "blocked") return { step: "blocked", role };
  if (result.result === "rejected") {
    if (result.reason === "missing") return { step: "form", error: "server", values };
    return { step: "rejected", failedAttempts: result.failed_attempts, role };
  }
  if (result.existing_profile_id) return { step: "exists", role };

  // The hospital's list is the source of truth for the licence; a different typed number is a mismatch.
  const rosterLicence = result.licence_no?.trim();
  if (isStaff && role !== "hospital_admin" && rosterLicence && rosterLicence.toLowerCase() !== licenceNo.toLowerCase()) {
    return { step: "form", fieldErrors: { licenceNo: "licenceMismatch" }, values };
  }

  const target = result.phone;
  if (!isValidNigerianPhone(target)) return { step: "form", error: "noPhoneOnFile", values };

  const session = await admin
    .from("signup_sessions")
    .insert({
      hospital_id: hospitalId,
      role,
      full_name: result.full_name,
      phone: target,
      email: result.email?.toLowerCase() ?? null,
      staff_id: isStaff ? staffId : null,
      hospital_number: isStaff ? null : hospitalNumber,
      licence_body: result.licence_body ?? (isStaff && role !== "hospital_admin" ? licenceBody : null),
      licence_no: rosterLicence ?? (isStaff && role !== "hospital_admin" ? licenceNo : null),
      roster_id: result.roster_id ?? null,
      registry_id: result.registry_id ?? null,
      consent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (session.error || !session.data) return { step: "form", error: "server", values };

  const otp = await issueOtp({ target, purpose: "signup", owner: { signupSessionId: session.data.id }, message: otpSms });
  return { step: "otp", sessionId: session.data.id, masked: otp.maskedTarget, delivery: otp.delivery, role };
}

async function loadSession(id: string): Promise<SignupSession | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("signup_sessions").select("*").eq("id", id).maybeSingle();
  const session = data as SignupSession | null;
  if (!session || session.status !== "pending_otp" || new Date(session.expires_at) < new Date()) return null;
  return session;
}

async function resendSignupOtp(prev: SignupState): Promise<SignupState> {
  if (prev.step !== "otp") return prev;
  const session = await loadSession(prev.sessionId);
  if (!session) return { step: "form", error: "sessionExpired" };
  const otp = await issueOtp({ target: session.phone, purpose: "signup", owner: { signupSessionId: session.id }, message: otpSms });
  if (otp.cooldownSeconds) return { ...prev, error: undefined, resent: false, cooldownSeconds: otp.cooldownSeconds };
  return { ...prev, delivery: otp.delivery, error: undefined, triesLeft: undefined, cooldownSeconds: undefined, resent: true };
}

async function confirmSignup(prev: SignupState, formData: FormData): Promise<SignupState> {
  if (prev.step !== "otp") return prev;
  const code = field(formData, "code").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) return { ...prev, error: "codeFormat", resent: false };

  const session = await loadSession(prev.sessionId);
  if (!session) return { step: "form", error: "sessionExpired" };

  const check = await checkOtp({ signupSessionId: session.id }, "signup", code);
  if (!check.ok) {
    if (check.reason === "wrong") return { ...prev, error: "codeWrong", triesLeft: check.triesLeft, resent: false };
    return { ...prev, error: check.reason, triesLeft: 0, resent: false };
  }

  // Account + verified profile, then burn the code, then the session cookie.
  const admin = createAdminClient();
  const email = session.email?.trim().toLowerCase() || syntheticEmailForPhone(session.phone);
  const userId = await ensureAuthUser({ email, phone: session.phone, fullName: session.full_name });
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: session.role,
      hospital_id: session.hospital_id,
      full_name: session.full_name,
      phone: session.phone,
      email,
      staff_id: session.staff_id,
      hospital_number: session.hospital_number,
      licence_body: session.licence_body,
      licence_no: session.licence_no,
      verified_status: "verified",
      failed_attempts: 0,
      consent_at: session.consent_at,
    },
    { onConflict: "id" },
  );
  if (profileError) return { ...prev, error: "server", resent: false };
  if (!(await consumeOtp(check.otp.id))) return { ...prev, error: "missing", triesLeft: 0, resent: false };

  await admin.from("signup_sessions").update({ status: "completed" }).eq("id", session.id);
  await admin.from("audit_log").insert({
    actor_id: userId,
    action: "signup_completed",
    target_table: "profiles",
    target_id: userId,
    detail: { role: session.role, hospital_id: session.hospital_id },
  });

  await createSessionForEmail(email);
  redirect(homeForRole[session.role]);
}

/** One entry point for the form: the hidden `intent` field picks the step. Nothing thrown
 * reaches the browser as a crash; the form shows "server" and keeps its state. */
export async function signupAction(prev: SignupState, formData: FormData): Promise<SignupState> {
  const intent = formData.get("intent");
  try {
    if (intent === "confirm") return await confirmSignup(prev, formData);
    if (intent === "resend") return await resendSignupOtp(prev);
    if (intent === "restart") return { step: "form" };
    return await startSignup(prev, formData);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("[signup]", error);
    if (prev.step === "otp") return { ...prev, error: "server", resent: false };
    return { step: "form", error: "server", values: prev.step === "form" ? prev.values : undefined };
  }
}
