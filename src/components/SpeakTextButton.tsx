"use client";

import { useSpeech } from "@/lib/speech";
import { PlayIcon, StopIcon } from "./icons";

/** Speaks a given text. Says so plainly when this device has no voice for the language. */
export function SpeakTextButton({ text, label, stopLabel }: { text: string; label: string; stopLabel: string }) {
  const { speaking, message, speak, stop } = useSpeech();

  return (
    <div>
      <button type="button" onClick={() => (speaking ? stop() : speak(text))} className="btn-primary px-4">
        {speaking ? <StopIcon /> : <PlayIcon />}
        {speaking ? stopLabel : label}
      </button>
      <p role="status" className="mt-3 text-base text-mocha empty:hidden">
        {message}
      </p>
    </div>
  );
}
