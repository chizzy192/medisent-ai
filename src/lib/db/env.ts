/**
 * Client-safe environment switches (this module is imported by client components, so only
 * NEXT_PUBLIC_* names appear here; server secrets live in src/lib/db/secrets.ts).
 * Environment switches for Stage 1. Supabase keys are optional in development: pages and
 * actions that need them show a setup notice instead of crashing (BUILD_PLAN: keys only in env).
 */
/** Opt-in only: a deployment that forgets the variable must not accept the fixed demo code. */
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** Fixed one-time code in demo mode so judges and tests never depend on SMS delivery. */
export const DEMO_OTP = "123456";

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Patients have no email; Supabase Auth still needs one per user. */
export function syntheticEmailForPhone(phoneE164: string): string {
  return `${phoneE164.replace(/\D/g, "")}@patients.medisent.local`;
}

/** Nigerian numbers in E.164. Mirrors normalize_phone() in 0001_schema.sql. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (/^0\d{10}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^[789]\d{9}$/.test(digits)) return `+234${digits}`;
  if (/^234\d{10}$/.test(digits)) return `+${digits}`;
  return `+${digits}`;
}

export function isValidNigerianPhone(e164: string | null): e164 is string {
  return Boolean(e164 && /^\+234\d{10}$/.test(e164));
}
