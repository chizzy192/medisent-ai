import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, locales, LOCALE_COOKIE, type Locale } from "@/config/locales";

/** First visit: honour the browser's preferred language when it is one we support. */
function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    const match = locales.find((code) => tag === code || tag.startsWith(`${code}-`));
    if (match) return match;
  }
  return null;
}

// Locale comes from a cookie (set at signup / by the language controls), then the browser's
// Accept-Language, then English. Later stages also sync it to profiles.language.
export default getRequestConfig(async () => {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(fromCookie)
    ? fromCookie
    : (fromAcceptLanguage((await headers()).get("accept-language")) ?? defaultLocale);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
