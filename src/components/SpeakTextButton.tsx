"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { htmlLang, isLocale } from "@/config/locales";
import { PlayIcon, StopIcon } from "./icons";

/** Speaks a given text (Web Speech for now; /api/speak from Stage 2). */
export function SpeakTextButton({ text, label, stopLabel }: { text: string; label: string; stopLabel: string }) {
  const locale = useLocale();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function toggle() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = htmlLang[isLocale(locale) ? locale : "en"];
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={speaking} className="btn-primary px-4">
      {speaking ? <StopIcon /> : <PlayIcon />}
      {speaking ? stopLabel : label}
    </button>
  );
}
