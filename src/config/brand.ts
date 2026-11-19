import type { Locale } from "./locales";

/**
 * The ONE place the app name lives. If the final name follows the domain,
 * change it here only (BUILD_PLAN section 1 and 9).
 * Brand names are not translated, so `name` is the same in every locale.
 */
export const brand = {
  name: "Medisent AI",
  /** Multilingual signature line shown on the landing page in every locale. */
  signature: "Ọgwụ. Oògùn. Magani.",
  /** Never hard-code a domain; it comes from NEXT_PUBLIC_APP_URL. */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  /** Fallback header bar colour when a hospital has no brand_color (denim). */
  defaultBrandColor: "#2F5D8A",
} as const;

/** Tagline line shown under the name. Native speakers must check before demo. */
export const tagline: Record<Locale, string> = {
  en: "Your medicine, in your language.",
  ig: "Ọgwụ gị, n'asụsụ gị.",
  yo: "Oògùn rẹ, ní èdè rẹ.",
  ha: "Maganinka, a harshenka.",
  pcm: "Your medicine, for your own language.",
};

export function appName(): string {
  return brand.name;
}
