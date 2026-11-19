"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { localeCodes, localeNames, locales, type Locale } from "@/config/locales";
import { previewAudioSrc, previewLabel, previewSentence } from "@/config/landingPreview";
import { PlayIcon, StopIcon } from "@/components/icons";
import { StatusChip } from "@/components/StatusChip";
import { TodayRing } from "@/components/TodayRing";

/** Bar heights for the waveform (24 bars, drawn once; they only move while audio plays). */
const BARS = [8, 14, 22, 12, 26, 18, 10, 24, 16, 28, 12, 20, 26, 10, 18, 24, 14, 28, 16, 22, 10, 20, 14, 8];

const voicePrefixes: Record<Locale, string[]> = { en: ["en"], ig: ["ig"], yo: ["yo"], ha: ["ha"], pcm: ["pcm", "en"] };

/**
 * Live preview console (BUILD_PLAN Stage 0, landing section 3): one prescription, five
 * languages. Tabs swap the spoken sentence and play its audio from public/audio/landing/;
 * when a file is missing it falls back to a browser voice for that language, and says so
 * plainly when there is none. Server-rendered with the visitor's locale selected, so without
 * JS it still shows a sentence (English for English visitors).
 */
export function PreviewConsole({ initial, time }: { initial: Locale; time: string }) {
  const t = useTranslations("landing");
  const [active, setActive] = useState<Locale>(initial);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Per language: an audio file exists or this device has a voice for it (undefined = not checked yet). */
  const [available, setAvailable] = useState<Partial<Record<Locale, boolean>>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);

  // Say up front when a language cannot be played here, instead of failing on tap.
  useEffect(() => {
    if (available[active] !== undefined) return;
    let cancelled = false;
    const hasVoice = () =>
      (window.speechSynthesis?.getVoices() ?? []).some((v) =>
        voicePrefixes[active].some((prefix) => v.lang.toLowerCase().startsWith(prefix)),
      );
    fetch(previewAudioSrc(active), { method: "HEAD" })
      .then((res) => res.ok && (res.headers.get("content-type") ?? "").startsWith("audio/"))
      .catch(() => false)
      .then((file) => {
        if (!cancelled) setAvailable((prev) => ({ ...prev, [active]: file || hasVoice() }));
      });
    return () => {
      cancelled = true;
    };
  }, [active, available]);

  const speakFallback = useCallback(
    (code: Locale) => {
      const synth = window.speechSynthesis;
      const voices = synth?.getVoices() ?? [];
      const voice = voicePrefixes[code]
        .map((prefix) => voices.find((v) => v.lang.toLowerCase().startsWith(prefix)))
        .find(Boolean);
      if (!synth || !voice) {
        setMessage(t("previewVoiceMissing", { language: localeNames[code] }));
        setPlaying(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(previewSentence[code]);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.9;
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      synth.cancel();
      synth.speak(utterance);
      setPlaying(true);
    },
    [t],
  );

  const play = useCallback(
    (code: Locale) => {
      stop();
      setMessage(null);
      const audio = new Audio(previewAudioSrc(code));
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        audioRef.current = null;
        speakFallback(code);
      };
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => speakFallback(code));
    },
    [speakFallback, stop],
  );

  const select = (code: Locale) => {
    if (code === active) return;
    setActive(code);
    setMessage(null);
    if (playing) play(code);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? locales.length - 1 : (index + delta + locales.length) % locales.length;
    tabsRef.current[next]?.focus();
    select(locales[next]);
  };

  const language = localeNames[active];
  const panelId = `${baseId}-panel`;

  return (
    <section
      id="languages"
      aria-label={t("previewLabel")}
      className="scroll-mt-32 lg:scroll-mt-20 rounded-card border border-border bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="label-mono">{t("previewLabel")}</p>
          <StatusChip tone="neutral">{t("previewDemo")}</StatusChip>
        </div>
        <div role="tablist" aria-label={t("previewTabs")} className="flex flex-wrap gap-1">
          {locales.map((code, index) => {
            const selected = code === active;
            return (
              <button
                key={code}
                ref={(el) => {
                  tabsRef.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${code}`}
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                aria-label={localeNames[code]}
                onClick={() => select(code)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={`min-h-12 min-w-12 rounded-button border px-3 font-mono text-sm ${
                  selected
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border bg-surface text-ink-2 hover:border-primary hover:text-primary"
                }`}
              >
                {localeCodes[code]}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="grid lg:grid-cols-[1.1fr_1.1fr_1fr] lg:divide-x lg:divide-border max-lg:divide-y max-lg:divide-border"
      >
        {/* 1 · Scanned label */}
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

        {/* 2 · Spoken in <language> */}
        <div className="p-4 sm:p-5">
          <p className="label-mono">{t("previewCell2", { language })}</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (playing ? stop() : play(active))}
              aria-pressed={playing}
              disabled={available[active] === false}
              className="flex size-12 shrink-0 items-center justify-center rounded-button bg-primary text-on-primary hover:bg-primary-hover disabled:bg-surface-2 disabled:text-ink-3"
            >
              {playing ? <StopIcon size={22} /> : <PlayIcon size={22} />}
              <span className="sr-only">{playing ? t("previewStop") : t("previewPlay", { language })}</span>
            </button>
            <div aria-hidden="true" className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className={`w-[3px] shrink-0 rounded-full bg-primary ${playing ? "animate-wave" : ""}`}
                  style={{ height: h, animationDelay: `${i * 45}ms` }}
                />
              ))}
            </div>
          </div>
          <p lang={active} className="mt-4 text-lg font-medium text-ink">
            “{previewSentence[active]}”
          </p>
          {active !== "en" && (
            <p lang="en" className="mt-1 text-sm text-ink-2">
              {previewSentence.en}
            </p>
          )}
          <p role="status" className="mt-2 min-h-[1.5em] text-sm text-ink-2">
            {message ?? (available[active] === false ? t("previewAudioSoon") : null)}
          </p>
        </div>

        {/* 3 · Reminder set */}
        <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <TodayRing
            taken={previewLabel.taken}
            total={previewLabel.total}
            caption={t("previewRingCaption")}
            label={t("previewRingLabel", { taken: previewLabel.taken, total: previewLabel.total })}
          />
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
