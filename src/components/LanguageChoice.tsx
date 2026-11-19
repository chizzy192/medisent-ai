"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { isLocale, localeNames, locales } from "@/config/locales";
import { setLocale } from "@/i18n/actions";

/**
 * The five languages as real, large choices (each name in its own language).
 * Same action as the header picker; the current one is marked pressed.
 */
export function LanguageChoice({ label }: { label: string }) {
  const raw = useLocale();
  const current = isLocale(raw) ? raw : "en";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ordered = [current, ...locales.filter((code) => code !== current)];

  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${pending ? "opacity-60" : ""}`}>
      {ordered.map((code) => {
        const active = code === current;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setLocale(code);
                router.refresh();
              })
            }
            className={
              active
                ? "inline-flex min-h-12 items-center rounded-full border border-primary bg-primary-tint px-4 text-base font-medium text-primary"
                : "inline-flex min-h-12 items-center rounded-full border border-border bg-surface px-4 text-base text-ink-2 hover:border-primary hover:text-primary"
            }
          >
            {localeNames[code]}
          </button>
        );
      })}
    </div>
  );
}
