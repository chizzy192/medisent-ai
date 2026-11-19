"use client";

import { useSpeech } from "@/lib/speech";
import { PlayIcon, StopIcon } from "./icons";

/**
 * "Listen in <language>" control from the mockups: a play square on primary-tint plus a word.
 * Says so plainly when this device has no voice for the language.
 */
export function SpeakTextButton({ text, label, stopLabel }: { text: string; label: string; stopLabel: string }) {
  const { speaking, message, speak, stop } = useSpeech();

  return (
    <div>
      <button
        type="button"
        onClick={() => (speaking ? stop() : speak(text))}
        className="group inline-flex min-h-12 items-center gap-3 rounded-button pr-3 text-left text-base text-ink-2 hover:text-ink"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-button bg-primary-tint text-primary group-hover:bg-primary group-hover:text-on-primary">
          {speaking ? <StopIcon size={22} /> : <PlayIcon size={22} />}
        </span>
        {speaking ? stopLabel : label}
      </button>
      <p role="status" className="mt-2 text-sm text-ink-2 empty:hidden">
        {message}
      </p>
    </div>
  );
}
