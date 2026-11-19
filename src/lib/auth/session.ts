import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";

/**
 * Signs a user in from the server after our own OTP succeeded: the service role mints a
 * magic-link token for the user's (possibly synthetic) email, and the cookie-backed server
 * client redeems it, which sets the session cookies on the response.
 */
export async function createSessionForEmail(email: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "Could not create a session.");

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) throw new Error(verifyError.message);
}

/** Finds or creates the Supabase Auth user behind a profile. */
export async function ensureAuthUser(args: { email: string; phone: string | null; fullName: string }): Promise<string> {
  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: args.email,
    email_confirm: true,
    phone: args.phone ?? undefined,
    phone_confirm: Boolean(args.phone),
    user_metadata: { full_name: args.fullName },
  });
  if (!error && created.user) return created.user.id;

  // Already exists: look it up by email.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === args.email.toLowerCase());
  if (existing) return existing.id;
  throw new Error(error?.message ?? "Could not create the account.");
}
