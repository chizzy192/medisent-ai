"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/config/locales";
import { isSupabaseConfigured } from "@/lib/db/env";
import { createClient } from "@/lib/db/server";

/** Header language picker: cookie for everyone, plus profiles.language when signed in. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ language: locale }).eq("id", user.id);
  } catch {
    // Signed out or Supabase unreachable: the cookie alone is enough.
  }
}
