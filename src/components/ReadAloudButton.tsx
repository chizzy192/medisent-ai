"use client";

import { useTranslations } from "next-intl";
import { useSpeech } from "@/lib/speech";
import { SpeakerIcon, StopIcon } from "./icons";

/**
 * Reads the current screen's <main> aloud. Every screen has one (BUILD_PLAN rule).
 * Stage 2 switches the voice source to /api/speak.
 */
export function ReadAloudButton({ targetId = "main" }: { targetId?: string }) {
  const t = useTranslations("header");
  const { speaking, message, speak, stop } = useSpeech();

  function toggle() {
    if (speaking) return stop();
    const text = document.getElementById(targetId)?.innerText.trim();
    if (text) speak(text);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-button border border-tan bg-surface px-3 font-bold text-chocolate hover:bg-cream"
      >
        {speaking ? <StopIcon className="text-denim" /> : <SpeakerIcon className="text-denim" />}
        <span>{speaking ? t("stopReading") : t("readAloud")}</span>
      </button>
      <p
        role="status"
        className="absolute top-full right-0 z-10 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-card border border-sand bg-surface p-3 text-base shadow-card empty:hidden"
      >
        {message}
      </p>
    </div>
  );
}
