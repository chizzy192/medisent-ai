/**
 * Server-only environment checks. Kept out of src/lib/db/env.ts, which client components
 * import, so no server secret name is ever referenced from a browser bundle.
 */
import { isSupabaseConfigured } from "@/lib/db/env";

export function isServiceRoleConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY);
}

/** Postgres connection for the demo reset (Supabase → Connect → Transaction pooler URI). */
export function isDatabaseUrlConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
