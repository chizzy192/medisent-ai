/**
 * The ONE place the app name lives. If the final name follows the domain,
 * change it here only (BUILD_PLAN section 1 and 9).
 */
const word = "Medisent";
const badge = "AI";

export const brand = {
  /** Full name, used for titles, metadata and accessible labels. */
  name: `${word} ${badge}`,
  /** The logo sets the word in Plex Sans and the badge in a small mono chip (section 3 v2). */
  logo: { word, badge },
  /** Never hard-code a domain; it comes from NEXT_PUBLIC_APP_URL. */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  /** Header bar colour for a hospital with no brand_color (section 3 v2). */
  defaultBrandColor: "#1D4E89",
} as const;

/** Tagline line shown under the name (English only). */
export const tagline = "Your medicine, explained simply.";

export function appName(): string {
  return brand.name;
}
