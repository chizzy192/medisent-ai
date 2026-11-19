"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/config/locales";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // TODO (Stage 1): also write profiles.language for signed-in users.
}
