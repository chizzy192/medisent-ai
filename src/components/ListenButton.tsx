"use client";

import { useEffect, useRef } from "react";
import { tr } from "@/lib/strings";
import { useVoice } from "@/lib/speech/useVoice";
import { PlayIcon, StopIcon } from "./icons";

const showSourceBadge = process.env.NODE_ENV !== "production";

/**
 * "Listen" control for one sentence (instruction, reminder): play square on primary-tint plus a
 * word; says plainly when no voice is available. `rate` is the speech-speed setting.
 * In development a small mono badge shows where the clip came from (cache / spitch / browser).
 */
export function ListenButton({
  text,
  label,
  rate = 1,
  size = "md",
  autoPlay = false,
}: {
  text: string;
  label?: string;
  rate?: number;
  size?: "md" | "lg";
  autoPlay?: boolean;
}) {
  const t = tr("voice");
  const { speak, stop, speaking, message, source } = useVoice(rate);
  const big = size === "lg";
  const tried = useRef(false);

  // Reminder screen: one clip, once, on arrival; browsers that block autoplay fall back to the button.
  useEffect(() => {
    if (!autoPlay || tried.current) return;
    tried.current = true;
    const id = setTimeout(() => void speak(text).catch(() => undefined), 300);
    return () => clearTimeout(id);
  }, [autoPlay, speak, text]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (speaking ? stop() : speak(text))}
          aria-pressed={speaking}
          className={`group inline-flex max-w-full items-center gap-3 rounded-button text-left text-ink-2 hover:text-ink ${big ? "min-h-14 pr-4" : "min-h-12 pr-3"}`}
        >
          <span className={`flex shrink-0 items-center justify-center rounded-button bg-primary-tint text-primary group-hover:bg-primary group-hover:text-on-primary ${big ? "size-14" : "size-12"}`}>
            {speaking ? <StopIcon size={big ? 26 : 22} /> : <PlayIcon size={big ? 26 : 22} />}
          </span>
          <span className={`min-w-0 [overflow-wrap:anywhere] ${big ? "text-lg font-medium" : "text-base"}`}>{speaking ? t("stop") : (label ?? t("listen"))}</span>
        </button>
        {source === "browser" && <span className="rounded-full bg-warning-tint px-2 py-0.5 font-mono text-label text-warning uppercase">{t("offlineVoice")}</span>}
        {showSourceBadge && source && (
          <span data-testid="voice-source" className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-label text-ink-2 uppercase" title="Dev only: audio source">
            {source}
          </span>
        )}
      </div>
      <p role="status" className="mt-1 text-sm text-ink-2 empty:hidden">
        {message}
      </p>
    </div>
  );
}
