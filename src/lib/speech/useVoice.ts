"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isLocale, localeNames, type Locale } from "@/config/locales";
import { clientAudioKey, getCachedAudio, putCachedAudio } from "@/lib/offline/audio";

/**
 * Plays a sentence in the patient's language: IndexedDB cache → /api/speak (Spitch / 9jaLingo)
 * → browser voice as the last resort (English and Pidgin only; the app never reads Igbo, Yoruba
 * or Hausa with a voice from another language). `rate` is the speech speed setting.
 */
const voicePrefixes: Record<Locale, string[]> = { en: ["en"], ig: ["ig"], yo: ["yo"], ha: ["ha"], pcm: ["pcm", "en"] };

export type VoiceSource = "cache" | "server" | "browser" | null;

export function useVoice(rate = 1) {
  const t = useTranslations("voice");
  const raw = useLocale();
  const uiLocale: Locale = isLocale(raw) ? raw : "en";
  const [speaking, setSpeaking] = useState(false);
  const [source, setSource] = useState<VoiceSource>(null);
  const [message, setMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => stop, [stop]);

  const playBlob = useCallback(
    (blob: Blob) =>
      new Promise<void>((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = rate;
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
          reject(new Error("playback"));
        };
        audio.play().then(() => setSpeaking(true)).catch(reject);
      }),
    [rate],
  );

  const browserVoice = useCallback(
    (text: string, locale: Locale): boolean => {
      const synth = window.speechSynthesis;
      const voice = voicePrefixes[locale].map((p) => synth?.getVoices().find((v) => v.lang.toLowerCase().startsWith(p))).find(Boolean);
      if (!synth || !voice) return false;
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.9 * rate;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.cancel();
      synth.speak(u);
      setSpeaking(true);
      setSource("browser");
      return true;
    },
    [rate],
  );

  const speak = useCallback(
    async (text: string, locale: Locale = uiLocale) => {
      stop();
      setMessage(null);
      const key = await clientAudioKey(text, locale);
      const hit = await getCachedAudio(key);
      if (hit) {
        setSource("cache");
        try {
          await playBlob(hit.blob);
          return;
        } catch {
          /* fall through to the server */
        }
      }
      try {
        const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: locale }) });
        if (res.ok && (res.headers.get("content-type") ?? "").startsWith("audio/")) {
          const blob = await res.blob();
          void putCachedAudio({ key, blob, mime: blob.type, createdAt: Date.now() });
          setSource("server");
          await playBlob(blob);
          return;
        }
      } catch {
        /* offline or server error: browser voice next */
      }
      if (!browserVoice(text, locale)) {
        setSource(null);
        setMessage(t("unavailable", { language: localeNames[locale] }));
      }
    },
    [browserVoice, playBlob, stop, t, uiLocale],
  );

  return { speak, stop, speaking, source, message };
}
