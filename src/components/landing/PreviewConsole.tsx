"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { tr } from "@/lib/strings";
import { previewAudioSrc, previewLabel, previewSentence } from "@/config/landingPreview";
import { PlayIcon, StopIcon } from "@/components/icons";
import { StatusChip } from "@/components/StatusChip";
import { TodayRing } from "@/components/TodayRing";
import { playBlob, playUtterance, stopAll, usePlayerState } from "@/lib/speech/player";

/** Bar heights for the waveform (24 bars, drawn once; they only move while audio plays). */
const BARS = [8, 14, 22, 12, 26, 18, 10, 24, 16, 28, 12, 20, 26, 10, 18, 24, 14, 28, 16, 22, 10, 20, 14, 8];
const showSourceBadge = process.env.NODE_ENV !== "production";

/**
 * Live preview console (BUILD_PLAN Stage 0, landing section 3): one prescription, scanned,
 * read out loud in plain English and set as a reminder. The clip comes from
 * public/audio/landing/en.mp3 through the shared player (one clip at a time); without the
 * file the browser's English voice reads the sentence, or the console says no voice is there.
 * Server-rendered, so without JS it still shows the sentence.
 */
export function PreviewConsole({ time }: { time: string }) {
  const t = tr("landing");
  const [message, setMessage] = useState<string | null>(null);
  /** The audio file exists or a browser English voice is there (undefined = not checked yet). */
  const [available, setAvailable] = useState<boolean | undefined>(undefined);
  const baseId = useId();
  const myKey = `${baseId}-player`;
  const player = usePlayerState();
  const playing = player.playingKey === myKey;

  const stop = useCallback(() => {
    if (player.playingKey === myKey) stopAll();
  }, [myKey, player.playingKey]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (available !== undefined) return;
    let cancelled = false;
    const hasEnglishVoice = () => (window.speechSynthesis?.getVoices() ?? []).some((v) => v.lang.toLowerCase().startsWith("en"));
    fetch(previewAudioSrc, { method: "HEAD" })
      .then((res) => res.ok && (res.headers.get("content-type") ?? "").startsWith("audio/"))
      .catch(() => false)
      .then((file) => {
        if (!cancelled) setAvailable(file || hasEnglishVoice());
      });
    return () => {
      cancelled = true;
    };
  }, [available]);

  const play = useCallback(async () => {
    setMessage(null);
    try {
      const res = await fetch(previewAudioSrc);
      if (res.ok && (res.headers.get("content-type") ?? "").startsWith("audio/")) {
        await playBlob(myKey, await res.blob(), "cache");
        return;
      }
    } catch {
      /* no file */
    }
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find((v) => v.lang.toLowerCase().startsWith("en"));
    if (voice) {
      const u = new SpeechSynthesisUtterance(previewSentence);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.9;
      if (playUtterance(myKey, u)) return;
    }
    setMessage(t("previewVoiceMissing"));
  }, [myKey, t]);

  return (
    <section id="preview" aria-label={t("previewLabel")} className="scroll-mt-32 lg:scroll-mt-20 rounded-card border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3 sm:px-5">
        <p className="label-mono">{t("previewLabel")}</p>
        <StatusChip tone="neutral">{t("previewDemo")}</StatusChip>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1.1fr_1fr] lg:divide-x lg:divide-border max-lg:divide-y max-lg:divide-border">
        <div className="p-4 sm:p-5">
          <p className="label-mono">{t("previewCell1")}</p>
          <div className="mt-3 rounded-button border border-dashed border-border bg-bg p-3 font-mono text-sm text-ink">
            {previewLabel.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-2 text-label text-ink-3">{previewLabel.nafdac}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusChip tone="success">{t("previewRegistered")}</StatusChip>
            <StatusChip tone="primary">
              <span className="font-mono">{t("previewConfidence", { value: previewLabel.confidence })}</span>
            </StatusChip>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="label-mono">{t("previewCell2")}</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (playing ? stop() : play())}
              aria-pressed={playing}
              disabled={available === false}
              className="flex size-12 shrink-0 items-center justify-center rounded-button bg-primary text-on-primary hover:bg-primary-hover disabled:bg-surface-2 disabled:text-ink-3"
            >
              {playing ? <StopIcon size={22} /> : <PlayIcon size={22} />}
              <span className="sr-only">{playing ? t("previewStop") : t("previewPlay")}</span>
            </button>
            {showSourceBadge && playing && player.source && (
              <span data-testid="voice-source" className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-label text-ink-2 uppercase" title="Dev only: audio source">
                {player.source}
              </span>
            )}
            <div aria-hidden="true" className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
              {BARS.map((h, i) => (
                <span key={i} className={`w-[3px] shrink-0 rounded-full bg-primary ${playing ? "animate-wave" : ""}`} style={{ height: h, animationDelay: `${i * 45}ms` }} />
              ))}
            </div>
          </div>
          <p className="mt-4 text-lg font-medium text-ink">“{previewSentence}”</p>
          <p role="status" className="mt-2 min-h-[1.5em] text-sm text-ink-2">
            {message ?? (available === false ? t("previewAudioSoon") : null)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <TodayRing taken={previewLabel.taken} total={previewLabel.total} caption={t("previewRingCaption")} label={t("previewRingLabel", { taken: previewLabel.taken, total: previewLabel.total })} />
          <div className="min-w-0 flex-[1_1_9rem]">
            <p className="label-mono">{t("previewCell3")}</p>
            <p className="mt-1 font-mono text-time font-medium text-ink">{time}</p>
            <p className="text-sm text-ink-2">{t("previewReminderMeta")}</p>
            <div className="mt-2">
              <StatusChip tone="warning">{t("previewRefill", { days: previewLabel.refillDays })}</StatusChip>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
