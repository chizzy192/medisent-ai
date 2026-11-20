"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { tr } from "@/lib/strings";
import { VoiceInput } from "@/components/assistant/VoiceInput";
import { Textarea } from "@/components/forms";
import { ListenButton } from "@/components/ListenButton";
import { StatusChip } from "@/components/StatusChip";
import { Card, SectionLabel } from "@/components/ui";
import { useVoice } from "@/lib/speech/useVoice";

type Step = 0 | 1 | 2;
type Result = { mood: "good" | "okay" | "low"; sideEffects: string[]; problems: string; alerted: boolean };

/**
 * Daily check-in (BUILD_PLAN Stage 3): three questions, each answered by tapping a choice,
 * speaking, or typing. Each question is read aloud. The parser (rules first, model second)
 * returns mood, side effects and whether a red flag fired; a red flag opens the red-flag screen.
 */
export function CheckinFlow({ rate, alreadyToday }: { rate: number; alreadyToday: boolean }) {
  const t = tr("checkin");
  const router = useRouter();
  const { speak } = useVoice(rate);
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const keys = ["feeling", "sideEffects", "problems"] as const;
  const options: Record<(typeof keys)[number], string[]> = {
    feeling: ["good", "okay", "low"],
    sideEffects: ["none", "dizziness", "nausea", "headache", "rash", "stomachPain"],
    problems: ["noProblem", "forgot", "ranOut", "hardToSwallow", "cost"],
  };
  const key = keys[step];
  const set = (v: string) => setAnswers((a) => a.map((x, i) => (i === step ? v : x)) as [string, string, string]);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feeling: answers[0], sideEffects: answers[1], problems: answers[2] }), signal: AbortSignal.timeout(60_000) });
      if (!res.ok) return setError(navigator.onLine ? "failed" : "offline");
      const json = (await res.json()) as Result & { redFlag: { kind: string } | null };
      if (json.redFlag) return router.push(`/redflag?kind=${json.redFlag.kind}&from=checkin`);
      setResult(json);
      void speak(t("thanksSpoken")).catch(() => undefined);
    } catch {
      setError(navigator.onLine ? "failed" : "offline");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Card as="section" className="space-y-3" testId="checkin-done">
        <SectionLabel as="h2">{t("doneLabel")}</SectionLabel>
        <p className="text-xl font-semibold">{t("doneTitle")}</p>
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={result.mood === "good" ? "success" : result.mood === "low" ? "warning" : "neutral"}>{t(`moods.${result.mood}`)}</StatusChip>
          {result.sideEffects.map((s) => (
            <StatusChip key={s} tone="warning">
              {s}
            </StatusChip>
          ))}
        </div>
        <p className="text-base text-ink-2">{result.alerted ? t("alerted") : t("noAlert")}</p>
        <ListenButton text={t("thanksSpoken")} rate={rate} />
        <Link href="/home" className="btn-primary w-full">
          {t("backHome")}
        </Link>
      </Card>
    );
  }

  const question = t(`questions.${key}`);
  return (
    <div className="space-y-4">
      {alreadyToday && <p className="rounded-button bg-primary-tint p-3 text-base text-primary">{t("alreadyToday")}</p>}
      <div>
        <SectionLabel>{t("stepLabel", { step: step + 1, total: 3 })}</SectionLabel>
        <h1 className="mt-1 text-2xl">{question}</h1>
        <div className="mt-2">
          <ListenButton text={question} rate={rate} label={t("hearQuestion")} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={question}>
        {options[key].map((o) => {
          const label = t(`options.${o}`);
          const selected = answers[step] === label;
          return (
            <button key={o} type="button" onClick={() => set(label)} aria-pressed={selected} data-testid={`opt-${o}`} className={`min-h-12 rounded-button border-2 px-4 text-base ${selected ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-ink hover:border-primary"}`}>
              {label}
            </button>
          );
        })}
      </div>

      <Card as="section" className="space-y-3">
        <VoiceInput onTranscript={(s) => set(answers[step] ? `${answers[step]} ${s}` : s)} disabled={busy} />
        <label htmlFor={`answer-${step}`} className="block text-base font-medium">
          {t("orType")}
        </label>
        <Textarea id={`answer-${step}`} value={answers[step]} onChange={(e) => set(e.target.value)} rows={2} maxLength={400} data-testid="checkin-answer" />
      </Card>

      {error && (
        <p role="alert" className="rounded-button bg-warning-tint p-3 text-base text-warning">
          {t(`errors.${error}`)}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {step < 2 ? (
          <button type="button" onClick={() => setStep((s) => (s + 1) as Step)} disabled={!answers[step].trim()} className="btn-primary flex-1 disabled:opacity-60" data-testid="checkin-next">
            {t("next")}
          </button>
        ) : (
          <button type="button" onClick={finish} disabled={busy || !answers[2].trim()} className="btn-primary flex-1 disabled:opacity-60" data-testid="checkin-finish">
            {busy ? t("saving") : t("finish")}
          </button>
        )}
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => (s - 1) as Step)} disabled={busy} className="btn-outline flex-1">
            {t("back")}
          </button>
        )}
      </div>
    </div>
  );
}
