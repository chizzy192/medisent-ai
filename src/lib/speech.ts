"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isLocale, localeNames, type Locale } from "@/config/locales";

/**
 * Browser speech for Stage 0. Stage 2 replaces this with /api/speak (Spitch / 9jaLingo).
 * Never reads Igbo, Yoruba or Hausa with a voice from another language: without a matching
 * voice it says so instead. Pidgin may fall back to an English voice.
 */
const voicePrefixes: Record<Locale, string[]> = {
  en: ["en"],
  ig: ["ig"],
  yo: ["yo"],
  ha: ["ha"],
  pcm: ["pcm", "en"],
};

/** Chrome fills the voice list asynchronously; wait briefly for it before deciding. */
function loadVoices(synth: SpeechSynthesis, timeoutMs = 1000): Promise<SpeechSynthesisVoice[]> {
  const now = synth.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    synth.addEventListener("voiceschanged", done);
  });
}

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

  // Prime the voice list early, and stop speaking when the language changes or on unmount.
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return stop;
  }, [locale, stop]);

  const speak = useCallback(
    async (text: string) => {
      const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
      if (!synth) {
        setMessage(t("readAloudUnavailable"));
        return;
      }
      const voices = await loadVoices(synth);
      const voice = voicePrefixes[locale]
        .map((prefix) => voices.find((v) => v.lang.toLowerCase().startsWith(prefix)))
        .find(Boolean);
      if (!voice) {
        setMessage(t("voiceMissing", { language: localeNames[locale] }));
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
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
