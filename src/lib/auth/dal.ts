import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/db/env";
import { homeForRole, type Hospital, type Profile, type Role } from "@/lib/db/types";

/**
 * Data Access Layer (Next.js authentication guide): every protected page and action gets the
 * signed-in profile from here, so the authorization check cannot be forgotten.
 */
export type Session = { profile: Profile; hospital: Hospital | null };

export const getSession = cache(async (): Promise<Session | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return null;

  let hospital: Hospital | null = null;
  if (profile.hospital_id) {
    const { data } = await supabase.from("hospitals").select("*").eq("id", profile.hospital_id).maybeSingle();
    hospital = (data as Hospital | null) ?? null;
  }
  return { profile: profile as Profile, hospital };
});

/** Redirects to /login when signed out, and to the user's own home when the role does not fit. */
export async function requireRole(allowed: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!allowed.includes(session.profile.role)) redirect(homeForRole[session.profile.role]);
  if (session.profile.verified_status !== "verified") redirect("/login?reason=unverified");
  return session;
}

export const patientRoles: Role[] = ["patient"];
export const staffRoles: Role[] = ["doctor", "pharmacist", "nurse", "hospital_admin"];
export const adminRoles: Role[] = ["hospital_admin"];
export const platformRoles: Role[] = ["platform_admin"];
