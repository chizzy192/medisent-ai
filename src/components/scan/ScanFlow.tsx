"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ScanResponse } from "@/app/api/scan/route";
import type { Locale } from "@/config/locales";
import { CONFIDENCE_FLOOR, KEY_FIELDS } from "@/lib/ai/scan";
import { FormMessage } from "@/components/forms";
import { StatusChip } from "@/components/StatusChip";
import { SectionLabel } from "@/components/ui";
import { ConfirmForm } from "./ConfirmForm";

type Phase = "idle" | "camera" | "reading" | "found" | "failed" | "confirm";

/**
 * Scan flow (BUILD_PLAN Stage 2, signature element 4): live viewfinder with four cobalt
 * corner brackets, a sweeping line while reading and a status chip; below it the "Found so
 * far" card fills in Drug, Strength, NAFDAC as the reader answers. Low confidence or missing
 * fields show "Turn the pack" and offer a retake. File picker fallback when there is no camera.
 */
export function ScanFlow({ locale, rate }: { locale: Locale; rate: number }) {
  const t = useTranslations("scan");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [shown, setShown] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const generation = useRef(0);

  const stopCamera = useCallback(() => {
    generation.current++;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      await Promise.resolve();
      return setCameraError("unsupported");
    }
    const gen = ++generation.current;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
    } catch (e) {
      setCameraError(e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "unavailable");
      return;
    }
    // Unmounted or retaken while the permission prompt was open: release this stream at once.
    if (gen !== generation.current) return stream.getTracks().forEach((t) => t.stop());
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = stream;
    setCameraError(null);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }
    setPhase("camera");
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void startCamera(), 0);
    return () => {
      clearTimeout(id);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Progress ticks while the reader works (the API answers in one go); the first value is set
  // where reading starts, so the effect only schedules timers.
  useEffect(() => {
    if (phase !== "reading") return;
    const id = setInterval(() => setProgress((p) => Math.min(92, p + Math.max(1, Math.round((92 - p) / 8)))), 400);
    return () => clearInterval(id);
  }, [phase]);

  // "Found so far" fills field by field once the answer arrives.
  useEffect(() => {
    if (phase !== "found" || !result) return;
    const ids = [1, 2, 3].map((n) => setTimeout(() => setShown(n), n * 350));
    return () => ids.forEach(clearTimeout);
  }, [phase, result]);

  async function send(blob: Blob) {
    setError(null);
    setProgress(8);
    setShown(0);
    setPhase("reading");
    const form = new FormData();
    form.append("image", blob, "label.jpg");
    try {
      const res = await fetch("/api/scan", { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error === "image_too_big" ? "tooBig" : navigator.onLine ? "readerFailed" : "offline");
        setPhase("failed");
        return;
      }
      const json = (await res.json()) as ScanResponse;
      setResult(json);
      setProgress(100);
      setPhase("found");
    } catch {
      setError(navigator.onLine ? "readerFailed" : "offline");
      setPhase("failed");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPreview(canvas.toDataURL("image/jpeg", 0.8));
        stopCamera();
        void send(blob);
      },
      "image/jpeg",
      0.85,
    );
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    stopCamera();
    setPreview(URL.createObjectURL(file));
    void send(file);
  }

  function retake() {
    setResult(null);
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    setPhase("idle");
    void startCamera();
  }

  if (phase === "confirm" && result) {
    return <ConfirmForm scan={result} locale={locale} rate={rate} onBack={() => setPhase("found")} />;
  }

  const reading = phase === "reading";
  const found = phase === "found" && result;
  const weak = found && (result.needsRetry || result.scan.missing_fields.some((f) => KEY_FIELDS.includes(f)));
  const missing = found ? new Set(result.scan.missing_fields) : new Set<string>();

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>{t("stepLabel", { step: 1, total: 2 })}</SectionLabel>
        <h1 className="mt-1 text-2xl">{found ? t("foundTitle") : t("pointTitle")}</h1>
      </div>

      {/* Viewfinder: dark, four cobalt corner brackets, sweep line while reading, status chip. */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-[#0B1220]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- captured frame
          <img src={preview} alt="" className="size-full object-cover opacity-80" />
        ) : (
          <video ref={videoRef} playsInline muted aria-label={t("cameraPreview")} className="size-full object-cover" />
        )}
        {(["top-3 left-3 border-t-4 border-l-4 rounded-tl-xl", "top-3 right-3 border-t-4 border-r-4 rounded-tr-xl", "bottom-3 left-3 border-b-4 border-l-4 rounded-bl-xl", "bottom-3 right-3 border-b-4 border-r-4 rounded-br-xl"]).map((cls) => (
          <span key={cls} aria-hidden="true" className={`absolute size-10 border-primary ${cls}`} />
        ))}
        {reading && <span aria-hidden="true" className="animate-scan-sweep absolute inset-x-6 h-0.5 bg-primary" />}
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          {reading && (
            <StatusChip tone="primary">
              <span className="font-mono">{t("reading", { pct: progress })}</span>
            </StatusChip>
          )}
          {phase === "camera" && <StatusChip tone="neutral">{t("ready")}</StatusChip>}
          {found && !weak && <StatusChip tone="success">{t("done", { pct: Math.round(result.scan.confidence * 100) })}</StatusChip>}
          {found && weak && <StatusChip tone="warning">{t("weak", { pct: Math.round(result.scan.confidence * 100) })}</StatusChip>}
        </div>
      </div>

      {cameraError && !preview && <FormMessage tone="info">{t(`camera.${cameraError}`)}</FormMessage>}
      {error && <FormMessage tone="error">{t(`errors.${error}`)}</FormMessage>}
      <p role="status" className="sr-only">
        {reading ? t("reading", { pct: progress }) : found ? (weak ? t("weak", { pct: Math.round(result.scan.confidence * 100) }) : t("done", { pct: Math.round(result.scan.confidence * 100) })) : ""}
      </p>

      {/* Found so far: fills in field by field. */}
      {(reading || found) && (
        <section aria-live="polite" className="rounded-card border border-border bg-surface p-4">
          <SectionLabel>{t("foundSoFar")}</SectionLabel>
          <dl className="mt-2 divide-y divide-surface-2">
            {(
              [
                ["drug", result?.scan.drug_name, 1],
                ["strength", result?.scan.strength, 2],
                ["nafdac", result?.scan.nafdac_no, 3],
              ] as const
            ).map(([key, value, order]) => {
              const visible = found && shown >= order;
              const isMissing = visible && (!value || missing.has(key === "drug" ? "drug_name" : key === "nafdac" ? "nafdac_no" : "strength"));
              return (
                <div key={key} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                  <dt className="text-base text-ink-2">{t(`fields.${key}`)}</dt>
                  <dd className={`min-w-0 font-semibold [overflow-wrap:anywhere] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"} ${key === "drug" ? "text-lg" : "font-mono text-lg"}`}>
                    {isMissing ? <StatusChip tone="warning">{t("turnPack")}</StatusChip> : (value ?? "…")}
                  </dd>
                </div>
              );
            })}
          </dl>
          {found && result.check && shown >= 3 && (
            <div className="mt-3">
              <StatusChip tone={result.check.result === "registered" ? "success" : result.check.result === "unreadable" ? "neutral" : "warning"}>
                {t(`check.${result.check.result}`)}
              </StatusChip>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {phase === "camera" && (
          <button type="button" onClick={capture} className="btn-primary flex-1" data-testid="scan-capture">
            {t("capture")}
          </button>
        )}
        {found && (
          <>
            <button type="button" onClick={() => setPhase("confirm")} className="btn-primary flex-1" data-testid="scan-continue">
              {weak ? t("continueAnyway") : t("continue")}
            </button>
            <button type="button" onClick={retake} className="btn-outline flex-1">
              {t("retake")}
            </button>
          </>
        )}
        {phase === "failed" && (
          <button type="button" onClick={retake} className="btn-primary flex-1" data-testid="scan-retake">
            {t("retake")}
          </button>
        )}
        {!reading && !found && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} className={`flex-1 ${phase === "camera" || phase === "failed" ? "btn-outline" : "btn-primary"}`}>
              {t("choosePhoto")}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </>
        )}
      </div>
      {found && weak && <p className="text-base text-ink-2">{t("weakHint", { pct: Math.round(CONFIDENCE_FLOOR * 100) })}</p>}
    </div>
  );
}
