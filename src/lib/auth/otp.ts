import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/db/admin";
import { DEMO_OTP, demoMode } from "@/lib/db/env";
import type { OtpRow } from "@/lib/db/types";
import { sendSms } from "@/lib/sms";

/**
 * One-time codes we issue ourselves (owner decision, Stage 1): six digits, 10-minute life,
 * five tries, 60-second resend cooldown. Demo mode (NEXT_PUBLIC_DEMO_MODE=true) uses the fixed
 * code 123456 and shows it on screen; otherwise the code goes by SMS to the phone on file.
 *
 * A code belongs to a profile (login) or a signup session (signup). Checks look the code up by
 * that owner, never by an id the browser sent, and the attempt counter and the used flag are
 * updated atomically in SQL (0005_otp.sql).
 */
export type OtpOwner = { profileId: string } | { signupSessionId: string };
const RESEND_COOLDOWN_MS = 60_000;

function hash(code: string, target: string) {
  return createHash("sha256").update(`${target}:${code}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex");
}

export type IssueResult = { delivery: "demo" | "sms" | "logged"; maskedTarget: string; cooldownSeconds?: number };

export async function issueOtp(args: { target: string; purpose: "signup" | "login"; owner: OtpOwner; message: (code: string) => string }): Promise<IssueResult> {
  const admin = createAdminClient();
  const ownerCol = "profileId" in args.owner ? "profile_id" : "signup_session_id";
  const ownerId = "profileId" in args.owner ? args.owner.profileId : args.owner.signupSessionId;

  // Cooldown: one new code per minute per owner (each one costs an SMS to the person's phone).
  // It only applies while that code is still unused: after a completed sign-in a fresh one is issued at once.
  const { data: last } = await admin.from("otp_codes").select("created_at,used_at").eq(ownerCol, ownerId).eq("purpose", args.purpose).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && !last.used_at) {
    const age = Date.now() - new Date(last.created_at).getTime();
    if (age < RESEND_COOLDOWN_MS) return { delivery: demoMode ? "demo" : "sms", maskedTarget: maskPhone(args.target), cooldownSeconds: Math.ceil((RESEND_COOLDOWN_MS - age) / 1000) };
  }

  const code = demoMode ? DEMO_OTP : String(randomInt(0, 1_000_000)).padStart(6, "0");
  await admin.from("otp_codes").update({ used_at: new Date().toISOString() }).eq(ownerCol, ownerId).eq("purpose", args.purpose).is("used_at", null);
  const { error } = await admin.from("otp_codes").insert({
    target: args.target,
    purpose: args.purpose,
    code_hash: hash(code, args.target),
    signup_session_id: "signupSessionId" in args.owner ? args.owner.signupSessionId : null,
    profile_id: "profileId" in args.owner ? args.owner.profileId : null,
  });
  if (error) throw new Error(error.message);

  let delivery: IssueResult["delivery"] = "demo";
  if (!demoMode) {
    const sms = await sendSms(args.target, args.message(code));
    delivery = sms.sent ? "sms" : "logged";
  }
  return { delivery, maskedTarget: maskPhone(args.target) };
}

export type CheckResult = { ok: true; otp: OtpRow } | { ok: false; reason: "expired" | "wrong" | "too_many" | "missing"; triesLeft: number };

/** Counts one attempt (atomically) on the owner's newest live code and compares the hash. The
 * code is NOT consumed here: call consumeOtp() once the account work has succeeded. */
export async function checkOtp(owner: OtpOwner, purpose: "signup" | "login", code: string): Promise<CheckResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("otp_attempt", {
    p_profile_id: "profileId" in owner ? owner.profileId : null,
    p_session_id: "signupSessionId" in owner ? owner.signupSessionId : null,
    p_purpose: purpose,
  });
  if (error) throw new Error(error.message);
  const otp = (data as OtpRow | null) ?? null;
  if (!otp || !otp.id) {
    // No live code with tries left: tell apart expired / exhausted / none.
    const { data: lastRow } = await admin
      .from("otp_codes")
      .select("attempts,expires_at,used_at")
      .eq("profileId" in owner ? "profile_id" : "signup_session_id", "profileId" in owner ? owner.profileId : owner.signupSessionId)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lastRow || lastRow.used_at) return { ok: false, reason: "missing", triesLeft: 0 };
    if (new Date(lastRow.expires_at) < new Date()) return { ok: false, reason: "expired", triesLeft: 0 };
    return { ok: false, reason: "too_many", triesLeft: 0 };
  }

  const expected = Buffer.from(otp.code_hash);
  const given = Buffer.from(hash(code.replace(/\D/g, ""), otp.target));
  const match = expected.length === given.length && timingSafeEqual(expected, given);
  if (!match) {
    const triesLeft = Math.max(0, 5 - otp.attempts);
    return { ok: false, reason: triesLeft === 0 ? "too_many" : "wrong", triesLeft };
  }
  return { ok: true, otp };
}

/** Burns the code; false when another request got there first. */
export async function consumeOtp(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("otp_consume", { p_id: id });
  if (error) throw new Error(error.message);
  return data === true;
}

/** "+2348000000104" -> "+234 ••• ••• 0104" */
export function maskPhone(e164: string): string {
  return `${e164.slice(0, 4)} ••• ••• ${e164.slice(-4)}`;
}
