"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/db/admin";
import { isServiceRoleConfigured, isValidNigerianPhone, normalizePhone } from "@/lib/db/env";
import { homeForRole, type Profile } from "@/lib/db/types";
import { checkOtp, consumeOtp, issueOtp, type IssueResult } from "@/lib/auth/otp";
import { createSessionForEmail } from "@/lib/auth/session";
import { isRedirectError, otpSms } from "@/lib/auth/sms-text";

/**
 * Login for existing accounts: phone (patients, staff) or email (staff) → OTP to the phone on
 * the profile → session. The code is looked up by the profile it belongs to, never by an id
 * from the browser. Error strings are keys under `login.errors`.
 */
export type LoginState =
  | { step: "form"; error?: string; identifier?: string }
  | { step: "otp"; profileId: string; masked: string; delivery: IssueResult["delivery"]; next: string; error?: string; triesLeft?: number; cooldownSeconds?: number; resent?: boolean }
  | { step: "status"; status: "rejected" | "blocked" | "pending" };

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "";
}

async function loadProfile(id: string): Promise<Profile | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile | null) ?? null;
}

async function startLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = field(formData, "identifier");
  const next = safeNext(field(formData, "next"));
  if (!identifier) return { step: "form", error: "identifierRequired", identifier };
  if (!isServiceRoleConfigured()) return { step: "form", error: "notConfigured", identifier };

  const admin = createAdminClient();
  const phone = normalizePhone(identifier);
  const byEmail = identifier.includes("@");
  // Exact match on a lowercased email: no pattern characters reach the query.
  const { data } = byEmail
    ? await admin.from("profiles").select("*").eq("email", identifier.toLowerCase()).maybeSingle()
    : isValidNigerianPhone(phone)
      ? await admin.from("profiles").select("*").eq("phone", phone).maybeSingle()
      : { data: null };
  const profile = data as Profile | null;

  if (!profile) return { step: "form", error: byEmail || isValidNigerianPhone(phone) ? "noAccount" : "identifierInvalid", identifier };
  if (profile.verified_status !== "verified") {
    return { step: "status", status: profile.verified_status === "blocked" ? "blocked" : profile.verified_status === "rejected" ? "rejected" : "pending" };
  }
  if (!isValidNigerianPhone(profile.phone)) return { step: "form", error: "noPhoneOnFile", identifier };

  const otp = await issueOtp({ target: profile.phone, purpose: "login", owner: { profileId: profile.id }, message: otpSms });
  return { step: "otp", profileId: profile.id, masked: otp.maskedTarget, delivery: otp.delivery, next, cooldownSeconds: otp.cooldownSeconds };
}

async function resendLoginOtp(prev: LoginState): Promise<LoginState> {
  if (prev.step !== "otp") return prev;
  const profile = await loadProfile(prev.profileId);
  if (!profile || !isValidNigerianPhone(profile.phone)) return { step: "form", error: "noPhoneOnFile" };
  const otp = await issueOtp({ target: profile.phone, purpose: "login", owner: { profileId: profile.id }, message: otpSms });
  if (otp.cooldownSeconds) return { ...prev, error: undefined, resent: false, cooldownSeconds: otp.cooldownSeconds };
  return { ...prev, delivery: otp.delivery, error: undefined, triesLeft: undefined, cooldownSeconds: undefined, resent: true };
}

async function confirmLogin(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (prev.step !== "otp") return prev;
  const code = field(formData, "code").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) return { ...prev, error: "codeFormat", resent: false };

  const profile = await loadProfile(prev.profileId);
  if (!profile?.email || profile.verified_status !== "verified") return { step: "form", error: "server" };

  const check = await checkOtp({ profileId: profile.id }, "login", code);
  if (!check.ok) {
    if (check.reason === "wrong") return { ...prev, error: "codeWrong", triesLeft: check.triesLeft, resent: false };
    return { ...prev, error: check.reason, triesLeft: 0, resent: false };
  }
  if (!(await consumeOtp(check.otp.id))) return { ...prev, error: "missing", triesLeft: 0, resent: false };

  const admin = createAdminClient();
  await admin.from("audit_log").insert({ actor_id: profile.id, action: "login", target_table: "profiles", target_id: profile.id });
  await createSessionForEmail(profile.email);
  redirect(prev.next || homeForRole[profile.role]);
}

/** One entry point for the form: the hidden `intent` field picks the step. */
export async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  const intent = formData.get("intent");
  try {
    if (intent === "confirm") return await confirmLogin(prev, formData);
    if (intent === "resend") return await resendLoginOtp(prev);
    if (intent === "restart") return { step: "form" };
    return await startLogin(prev, formData);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("[login]", error);
    if (prev.step === "otp") return { ...prev, error: "server", resent: false };
    return { step: "form", error: "server", identifier: prev.step === "form" ? prev.identifier : undefined };
  }
}
