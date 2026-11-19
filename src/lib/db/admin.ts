import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses RLS. Server actions only, and every caller checks
 * authorization in code before touching another hospital's rows. Never imported by client code.
 */
let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY).");
  cached ??= createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return cached;
}
