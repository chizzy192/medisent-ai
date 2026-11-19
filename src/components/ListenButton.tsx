"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/config/locales";
import { useVoice } from "@/lib/speech/useVoice";
import { PlayIcon, StopIcon } from "./icons";

/**
 * "Listen" control for one sentence (instruction, reminder): play square on primary-tint plus a
 * word; says plainly when there is no voice for the language. `rate` is the speech-speed setting.
 */
export function ListenButton({
  text,
  locale,
  label,
  rate = 1,
  size = "md",
  autoPlay = false,
}: {
  text: string;
  locale?: Locale;
  label?: string;
  rate?: number;
  size?: "md" | "lg";
  autoPlay?: boolean;
}) {
  const t = useTranslations("voice");
  const { speak, stop, speaking, message, source } = useVoice(rate);
  const big = size === "lg";
  const tried = useRef(false);

  // Reminder screen: try to play once on arrival; browsers that block autoplay fall back to the button.
  useEffect(() => {
    if (!autoPlay || tried.current) return;
    tried.current = true;
    const id = setTimeout(() => void speak(text, locale).catch(() => undefined), 300);
    return () => clearTimeout(id);
  }, [autoPlay, locale, speak, text]);

  return (
    <div>
      <button
        type="button"
        onClick={() => (speaking ? stop() : speak(text, locale))}
        aria-pressed={speaking}
        className={`group inline-flex max-w-full items-center gap-3 rounded-button text-left text-ink-2 hover:text-ink ${big ? "min-h-14 pr-4" : "min-h-12 pr-3"}`}
      >
        <span className={`flex shrink-0 items-center justify-center rounded-button bg-primary-tint text-primary group-hover:bg-primary group-hover:text-on-primary ${big ? "size-14" : "size-12"}`}>
          {speaking ? <StopIcon size={big ? 26 : 22} /> : <PlayIcon size={big ? 26 : 22} />}
        </span>
        <span className={`min-w-0 [overflow-wrap:anywhere] ${big ? "text-lg font-medium" : "text-base"}`}>{speaking ? t("stop") : (label ?? t("listen"))}</span>
      </button>
      <p role="status" className="mt-1 text-sm text-ink-2 empty:hidden">
        {message ?? (speaking && source === "browser" ? t("browserVoice") : null)}
      </p>
    </div>
  );
}
