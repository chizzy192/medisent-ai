"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { tr } from "@/lib/strings";
import { clientAudioKey, getCachedAudio, putCachedAudio } from "@/lib/offline/audio";
import { playBlob, playUtterance, stopAll, usePlayerState, type VoiceSource } from "./player";

/**
 * Speaks an English sentence through the one shared player: IndexedDB cache → /api/speak
 * (Spitch "kingsley") → the browser's English voice only when the server cannot be reached,
 * labelled "Offline voice". `rate` is the patient's speech-speed setting (playback rate on top
 * of Spitch's 0.9).
 */
export type { VoiceSource };

export function useVoice(rate = 1) {
  const t = tr("voice");
  const myKey = useId();
  const player = usePlayerState();
  const [message, setMessage] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<VoiceSource>(null);
  const speaking = player.playingKey === myKey;
  const source = speaking ? player.source : lastSource;

  const stop = useCallback(() => {
    if (player.playingKey === myKey) stopAll();
  }, [myKey, player.playingKey]);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback(
    async (text: string) => {
      stopAll();
      setMessage(null);
      const key = await clientAudioKey(text);
      const hit = await getCachedAudio(key);
      if (hit) {
        setLastSource("cache");
        try {
          await playBlob(myKey, hit.blob, "cache", rate);
          return;
        } catch {
          /* fall through to the server */
        }
      }
      let reachable = true;
      try {
        const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        if (res.ok && (res.headers.get("content-type") ?? "").startsWith("audio/")) {
          const blob = await res.blob();
          const provider = (res.headers.get("x-voice") as VoiceSource) ?? "spitch";
          void putCachedAudio({ key, blob, mime: blob.type, createdAt: Date.now(), provider: provider ?? "spitch" });
          setLastSource(provider);
          await playBlob(myKey, blob, provider, rate);
          return;
        }
      } catch {
        reachable = false;
      }
      // No clip from the server: the browser's English voice, only when offline or unreachable.
      if (!reachable || !navigator.onLine) {
        const synth = window.speechSynthesis;
        const voice = synth?.getVoices().find((v) => v.lang.toLowerCase().startsWith("en"));
        if (synth && voice) {
          const u = new SpeechSynthesisUtterance(text);
          u.voice = voice;
          u.lang = voice.lang;
          u.rate = 0.9 * rate;
          if (playUtterance(myKey, u)) {
            setLastSource("browser");
            setMessage(t("offlineVoice"));
            return;
          }
        }
      }
      setLastSource(null);
      setMessage(t("unavailable"));
    },
    [myKey, rate, t],
  );

  return { speak, stop, speaking, source, message };
}
