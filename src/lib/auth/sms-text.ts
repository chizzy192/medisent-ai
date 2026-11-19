import type { Locale } from "@/config/locales";

/**
 * SMS wording in the person's own language (brand name untranslated). Hand-drafted; native
 * speakers must check. Kept out of messages/ because SMS is sent server-side without next-intl.
 */
const otpText: Record<Locale, (code: string) => string> = {
  en: (code) => `Medisent AI code: ${code}. It stops working after 10 minutes. Never share it.`,
  ig: (code) => `Koodu Medisent AI: ${code}. Ọ na-akwụsị ọrụ mgbe nkeji 10 gasịrị. Ekekọrịtala ya.`,
  yo: (code) => `Kóòdù Medisent AI: ${code}. Ó dáwọ́ dúró lẹ́yìn ìṣẹ́jú 10. Má ṣe fi fún ẹnikẹ́ni.`,
  ha: (code) => `Lambar Medisent AI: ${code}. Tana daina aiki bayan minti 10. Kada ka raba ta.`,
  pcm: (code) => `Medisent AI code: ${code}. E go stop to work after 10 minutes. No share am.`,
};

export function otpSms(locale: Locale): (code: string) => string {
  return otpText[locale] ?? otpText.en;
}

/** Next.js implements redirect() by throwing; actions that catch errors must let it through. */
export function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
