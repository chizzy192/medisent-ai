export const locales = ["en", "ig", "yo", "ha", "pcm"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "medisent_locale";

/** Each language's name written in that language (shown in the switcher). */
export const localeNames: Record<Locale, string> = {
  en: "English",
  ig: "Igbo",
  yo: "Yorùbá",
  ha: "Hausa",
  pcm: "Naijá (Pidgin)",
};

/** Short code shown on the compact header picker (`IG ▾`). Not translated. */
export const localeCodes: Record<Locale, string> = {
  en: "EN",
  ig: "IG",
  yo: "YO",
  ha: "HA",
  pcm: "PCM",
};

/** BCP 47 tag for <html lang> and Intl formatting. */
export const htmlLang: Record<Locale, string> = {
  en: "en-NG",
  ig: "ig",
  yo: "yo",
  ha: "ha",
  pcm: "pcm",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
