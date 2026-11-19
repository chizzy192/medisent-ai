"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { htmlLang, isLocale } from "@/config/locales";
import { SpeakerIcon, StopIcon } from "./icons";

/**
 * Reads the current screen's <main> aloud. Every screen has one (BUILD_PLAN rule).
 * Stage 0 uses the browser's Web Speech API; Stage 2 switches to /api/speak
 * (Spitch / 9jaLingo) so Igbo, Yoruba, Hausa and Pidgin get real voices.
 */
export function ReadAloudButton({ targetId = "main" }: { targetId?: string }) {
  const t = useTranslations("header");
  const locale = useLocale();
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function toggle() {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) {
      setMessage(t("readAloudUnavailable"));
      return;
    }
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const text = document.getElementById(targetId)?.innerText.trim();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = htmlLang[isLocale(locale) ? locale : "en"];
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setMessage(null);
    setSpeaking(true);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={speaking}
        className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-button border border-tan bg-surface px-3 font-bold text-chocolate hover:bg-cream"
      >
        {speaking ? <StopIcon className="text-denim" /> : <SpeakerIcon className="text-denim" />}
        <span>{speaking ? t("stopReading") : t("readAloud")}</span>
      </button>
      <p role="status" className="absolute top-full right-0 z-10 mt-2 w-64 empty:hidden rounded-card border border-sand bg-surface p-3 text-base shadow-sm">
        {message}
      </p>
    </div>
  );
}
