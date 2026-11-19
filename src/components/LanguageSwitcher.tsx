"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { isLocale, localeCodes, locales, localeNames } from "@/config/locales";
import { setLocale } from "@/i18n/actions";
import { ChevronDownIcon } from "./icons";

/**
 * Compact `IG ▾` picker (section 3 v2). A real <select> sits on top, transparent, so the
 * control keeps native keyboard and screen-reader behaviour; the options show each
 * language's own name.
 */
export function LanguageSwitcher() {
  const t = useTranslations("header");
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : "en";
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative flex h-12 min-w-12 items-center gap-1 rounded-button border border-border bg-surface px-3 text-ink-2 focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-primary">
      <span aria-hidden="true" className="font-mono text-sm">
        {localeCodes[locale]}
      </span>
      <ChevronDownIcon size={16} className="text-ink-3" />
      <select
        aria-label={t("language")}
        title={t("languageHint")}
        value={locale}
        aria-busy={pending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            await setLocale(next);
            router.refresh();
          });
        }}
        className="absolute -inset-px cursor-pointer appearance-none opacity-0 aria-busy:cursor-wait"
      >
        {locales.map((code) => (
          <option key={code} value={code} lang={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
