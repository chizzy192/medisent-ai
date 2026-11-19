"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { htmlLang, isLocale, localeNames, type Locale } from "@/config/locales";

/**
 * Browser speech for Stage 0. Stage 2 replaces this with /api/speak (Spitch / 9jaLingo).
 * Never reads Igbo, Yoruba or Hausa with a voice from another language: if the device
 * has no matching voice, it says so instead. Pidgin may fall back to an English voice.
 */
const voicePrefixes: Record<Locale, string[]> = {
  en: ["en"],
  ig: ["ig"],
  yo: ["yo"],
  ha: ["ha"],
  pcm: ["pcm", "en"],
};

export function useSpeech() {
  const t = useTranslations("header");
  const raw = useLocale();
  const locale: Locale = isLocale(raw) ? raw : "en";
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  // Stop when the language changes or the component goes away.
  useEffect(() => stop, [locale, stop]);

  const speak = useCallback(
    (text: string) => {
      const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
      if (!synth) {
        setMessage(t("readAloudUnavailable"));
        return;
      }
      const voices = synth.getVoices();
      const voice = voicePrefixes[locale]
        .map((prefix) => voices.find((v) => v.lang.toLowerCase().startsWith(prefix)))
        .find(Boolean);
      // An empty list means the browser has not loaded voices yet; let it choose.
      if (voices.length > 0 && !voice) {
        setMessage(t("voiceMissing", { language: localeNames[locale] }));
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voice?.lang ?? htmlLang[locale];
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      synth.cancel();
      synth.speak(utterance);
      setMessage(null);
      setSpeaking(true);
    },
    [locale, t],
  );

  return { speaking, message, speak, stop };
}
