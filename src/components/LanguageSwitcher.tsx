"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames } from "@/config/locales";
import { setLocale } from "@/i18n/actions";
import { ChevronDownIcon, GlobeIcon } from "./icons";

export function LanguageSwitcher() {
  const t = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="relative flex min-h-12 items-center gap-2 rounded-button border border-tan bg-surface pr-9 pl-3 text-chocolate focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-denim">
      <GlobeIcon className="shrink-0 text-mocha" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        disabled={pending}
        title={t("languageHint")}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            await setLocale(next);
            router.refresh();
          });
        }}
        className="min-h-12 cursor-pointer appearance-none bg-transparent py-2 text-base font-bold outline-none [field-sizing:content] disabled:opacity-60"
      >
        {locales.map((code) => (
          <option key={code} value={code} lang={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={20} className="pointer-events-none absolute right-3 text-mocha" />
    </label>
  );
}
