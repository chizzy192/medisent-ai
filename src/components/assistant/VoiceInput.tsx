"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/strings";
import { MicIcon, StopIcon } from "@/components/icons";
import { StatusChip } from "@/components/StatusChip";

type MicState = "idle" | "recording" | "transcribing";
export type MicError = "denied" | "unsupported" | "noSpeech" | "failed" | "notConfigured" | "offline" | "tooLong";

const BARS = 20;
const MAX_SECONDS = 30;

/**
 * Microphone input (signature element 5): a round mic button with a pulsing halo while it
 * records, a live waveform from the AnalyserNode, then "Hearing you…" while Spitch transcribes.
 * The transcript goes to `onTranscript`; the parent shows it in the text box so the patient can
 * correct it before sending. Every failure is a plain sentence, never a silent state.
 */
export function VoiceInput({ onTranscript, disabled = false }: { onTranscript: (text: string) => void; disabled?: boolean }) {
  const t = tr("mic");
  const [state, setState] = useState<MicState>("idle");
  const [error, setError] = useState<MicError | null>(null);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(4));
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const tickRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((x) => x.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  async function send(blob: Blob) {
    setState("transcribing");
    const form = new FormData();
    form.append("audio", blob, "speech.webm");
    try {
      const res = await fetch("/api/listen", { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
      if (res.status === 503) return setError("notConfigured");
      if (res.status === 422) return setError("noSpeech");
      if (!res.ok) return setError(navigator.onLine ? "failed" : "offline");
      const json = (await res.json()) as { text?: string };
      if (!json.text) return setError("noSpeech");
      onTranscript(json.text);
    } catch {
      setError(navigator.onLine ? "failed" : "offline");
    } finally {
      setState("idle");
    }
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setError("unsupported");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return setError(e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "unsupported");
    }
    streamRef.current = stream;
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      cleanup();
      if (blob.size < 1000) {
        setState("idle");
        setError("noSpeech");
        return;
      }
      void send(blob);
    };
    recorderRef.current = rec;
    // Waveform: 20 bars from the analyser's frequency bins, ~30 fps.
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(data);
        setLevels(Array.from({ length: BARS }, (_, i) => 4 + Math.round((data[Math.floor((i / BARS) * data.length)] / 255) * 28)));
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    } catch {
      /* no waveform without AudioContext; recording still works */
    }
    rec.start(250);
    startedAt.current = Date.now();
    setSeconds(0);
    tickRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) {
        setError("tooLong");
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      }
    }, 250);
    setState("recording");
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else cleanup();
  }

  const recording = state === "recording";
  const transcribing = state === "transcribing";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <span className="relative inline-flex">
          {recording && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-primary/30" />}
          <button
            type="button"
            onClick={recording ? stop : start}
            disabled={disabled || transcribing}
            aria-pressed={recording}
            aria-label={recording ? t("stop") : t("start")}
            data-testid="mic-button"
            className={`relative flex size-16 items-center justify-center rounded-full border-2 ${recording ? "border-primary bg-primary text-on-primary" : "border-primary bg-primary-tint text-primary"} disabled:opacity-60`}
          >
            {recording ? <StopIcon size={28} /> : <MicIcon size={28} />}
          </button>
        </span>
        <div className="min-w-0 flex-1">
          <div aria-hidden="true" className="flex h-9 items-center gap-[3px]">
            {levels.map((h, i) => (
              <span key={i} className={`w-[3px] rounded-full transition-[height] duration-75 ${recording ? "bg-primary" : "bg-border"}`} style={{ height: recording ? h : 4 }} />
            ))}
          </div>
          <p role="status" className="mt-1 text-base text-ink-2">
            {recording ? (
              <StatusChip tone="primary">
                <span className="font-mono">{t("listening", { seconds })}</span>
              </StatusChip>
            ) : transcribing ? (
              <StatusChip tone="neutral">{t("transcribing")}</StatusChip>
            ) : (
              t("hint")
            )}
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-base text-ink-2">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}
