"use client";

import { useSyncExternalStore } from "react";

/**
 * The one audio player (owner rule: only one clip plays at a time). Every Listen button, the
 * read-aloud header button and the landing console go through here; starting anything stops
 * whatever else is playing, including browser speechSynthesis. A module singleton, read by
 * components through useSyncExternalStore.
 */
export type VoiceSource = "cache" | "spitch" | "browser" | null;

export type PlayerState = {
  /** Which clip is playing (the caller's key), or null when silent. */
  playingKey: string | null;
  source: VoiceSource;
};

let state: PlayerState = { playingKey: null, source: null };
const listeners = new Set<() => void>();
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function emit(next: PlayerState) {
  state = next;
  listeners.forEach((l) => l());
}

export function stopAll(): void {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  if (state.playingKey !== null) emit({ playingKey: null, source: null });
}

/** Plays a blob; resolves when it ends. Rejects on playback failure (never on a later stop). */
export function playBlob(key: string, blob: Blob, source: VoiceSource, rate = 1): Promise<void> {
  stopAll();
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = rate;
    currentAudio = audio;
    currentUrl = url;
    const finish = () => {
      if (currentAudio === audio) {
        currentAudio = null;
        URL.revokeObjectURL(url);
        currentUrl = null;
        emit({ playingKey: null, source: null });
      }
    };
    audio.onended = () => {
      finish();
      resolve();
    };
    audio.onerror = () => {
      finish();
      reject(new Error("playback"));
    };
    audio
      .play()
      .then(() => emit({ playingKey: key, source }))
      .catch((e) => {
        finish();
        reject(e);
      });
  });
}

/** Browser speech synthesis through the same gate (English offline fallback only). */
export function playUtterance(key: string, utterance: SpeechSynthesisUtterance): boolean {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return false;
  stopAll();
  utterance.onend = () => emit({ playingKey: null, source: null });
  utterance.onerror = () => emit({ playingKey: null, source: null });
  synth.speak(utterance);
  emit({ playingKey: key, source: "browser" });
  return true;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const serverSnapshot: PlayerState = { playingKey: null, source: null };

export function usePlayerState(): PlayerState {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
