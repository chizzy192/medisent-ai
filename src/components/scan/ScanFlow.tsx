"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/strings";
import type { ScanResponse } from "@/app/api/scan/route";
import { DrugCheckChip, DrugCheckNote } from "@/components/DrugCheckChip";
import { FormMessage } from "@/components/forms";
import { InteractionCards } from "@/components/InteractionCards";
import { ListenButton } from "@/components/ListenButton";
import { PackReadCard } from "@/components/PackReadCard";
import { StatusChip } from "@/components/StatusChip";
import { Card, SectionLabel } from "@/components/ui";

type Phase = "idle" | "camera" | "reading" | "result" | "failed";

/**
 * Scan tab = "Is this my drug?" (BUILD_PLAN section 5). The viewfinder (four cobalt corner
 * brackets, sweep line while reading) reads the PRINTED fields of a pack, then matches them
 * against the patient's own prescriptions. Match: the dose FROM THE RECORD, read aloud. No
 * match: a calm warning and "ask your pharmacist". Expired or not on the NAFDAC list: warn.
 * The screen never shows a dose that is not in the record.
 */
export function ScanFlow({ rate }: { rate: number }) {
  const t = tr("scan");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResponse | null>(null);
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
    if (gen !== generation.current) return stream.getTracks().forEach((x) => x.stop());
    streamRef.current?.getTracks().forEach((x) => x.stop());
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

  useEffect(() => {
    if (phase !== "reading") return;
    const id = setInterval(() => setProgress((p) => Math.min(92, p + Math.max(1, Math.round((92 - p) / 8)))), 400);
    return () => clearInterval(id);
  }, [phase]);

  async function send(blob: Blob) {
    setError(null);
    setProgress(8);
    setPhase("reading");
    const form = new FormData();
    form.append("image", blob, "pack.jpg");
    try {
      const res = await fetch("/api/scan", { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error === "image_too_big" ? "tooBig" : navigator.onLine ? "readerFailed" : "offline");
        setPhase("failed");
        return;
      }
      setResult((await res.json()) as ScanResponse);
      setProgress(100);
      setPhase("result");
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

  const reading = phase === "reading";
  const match = result?.matches[0] ?? null;
  const verdict: "match" | "pending" | "noMatch" | "unreadable" | null = !result ? null : result.needsRetry && !match ? "unreadable" : match ? (match.status === "pending" ? "pending" : "match") : "noMatch";

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>{t("label")}</SectionLabel>
        <h1 className="mt-1 text-2xl">{result ? t("resultTitle") : t("pointTitle")}</h1>
        {!result && <p className="mt-1 text-base text-ink-2">{t("intro")}</p>}
      </div>

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
          {verdict === "match" && <StatusChip tone="success">{t("verdict.match")}</StatusChip>}
          {verdict === "pending" && <StatusChip tone="neutral">{t("verdict.pending")}</StatusChip>}
          {verdict === "noMatch" && <StatusChip tone="warning">{t("verdict.noMatch")}</StatusChip>}
          {verdict === "unreadable" && <StatusChip tone="warning">{t("verdict.unreadable")}</StatusChip>}
        </div>
      </div>

      {cameraError && !preview && <FormMessage tone="info">{t(`camera.${cameraError}`)}</FormMessage>}
      {error && <FormMessage tone="error">{t(`errors.${error}`)}</FormMessage>}
      <p role="status" className="sr-only">
        {reading ? t("reading", { pct: progress }) : verdict ? t(`verdict.${verdict}`) : ""}
      </p>

      {result && (
        <div className="space-y-4" data-testid="scan-result">
          {result.expired && <FormMessage tone="error">{t("expired", { date: result.pack.expiry_date.value ?? "" })}</FormMessage>}
          {result.interactions.length > 0 && (
            <section className="space-y-2">
              <SectionLabel as="h2">{t("interactionsTitle")}</SectionLabel>
              <InteractionCards hits={result.interactions} rate={rate} />
            </section>
          )}

          {match && (
            <Card as="section" className={`space-y-3 ${verdict === "match" ? "border-2 border-success" : ""}`}>
              <SectionLabel as="h2">{t("yourRecord")}</SectionLabel>
              <p className="text-xl font-semibold [overflow-wrap:anywhere]">
                {match.drug_name} <span className="font-mono text-lg font-medium text-ink-2">{match.strength}</span>
              </p>
              <p className="font-mono text-time font-medium text-ink">
                {match.dose} <span className="text-base text-ink-2">· {match.times.join(" · ")}</span>
              </p>
              {match.instructions_plain && <p className="text-lg">{match.instructions_plain}</p>}
              {match.instructions_plain && <ListenButton text={match.instructions_plain} rate={rate} size="lg" />}
              {verdict === "pending" && <p className="text-base text-ink-2">{t("pendingNote")}</p>}
            </Card>
          )}

          {verdict === "noMatch" && (
            <Card as="section" className="space-y-3 border-2 border-warning-dot">
              <SectionLabel as="h2">{t("noMatchTitle")}</SectionLabel>
              <p className="text-base">{t("noMatchBody", { name: result.pack.drug_name.value ?? "" })}</p>
              <p className="text-base text-ink-2">{t("askPharmacist")}</p>
              <Link href="/add" className="btn-outline w-full sm:w-auto">
                {t("addThis")}
              </Link>
            </Card>
          )}

          {verdict === "unreadable" && <FormMessage tone="info">{t("unreadableBody")}</FormMessage>}

          {result.check && result.check.result !== "registered" && (
            <Card as="section" className="space-y-2">
              <DrugCheckChip result={result.check.result} />
              <DrugCheckNote result={result.check.result} listedName={result.check.listedName} listedStrength={result.check.listedStrength} manufacturer={result.check.manufacturer} typedName={result.pack.drug_name.value ?? ""} typedStrength={result.pack.strength.value ?? ""} />
            </Card>
          )}
          {result.check?.result === "registered" && (
            <div className="flex flex-wrap items-center gap-2">
              <DrugCheckChip result="registered" />
              <span className="font-mono text-sm text-ink-2">{result.check.nafdacNo}</span>
            </div>
          )}

          <PackReadCard pack={result.pack} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {phase === "camera" && (
          <button type="button" onClick={capture} className="btn-primary flex-1" data-testid="scan-capture">
            {t("capture")}
          </button>
        )}
        {(phase === "result" || phase === "failed") && (
          <button type="button" onClick={retake} className={`flex-1 ${phase === "failed" ? "btn-primary" : "btn-outline"}`} data-testid="scan-retake">
            {t("retake")}
          </button>
        )}
        {!reading && phase !== "result" && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} className={`flex-1 ${phase === "camera" || phase === "failed" ? "btn-outline" : "btn-primary"}`}>
              {t("choosePhoto")}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </>
        )}
      </div>
      {!result && (
        <p className="text-sm text-ink-2">
          {t("addLead")}{" "}
          <Link href="/add" className="underline">
            {t("addLink")}
          </Link>
        </p>
      )}
    </div>
  );
}
