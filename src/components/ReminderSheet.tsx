"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { tr } from "@/lib/strings";
import { logDose } from "@/app/(patient)/home/actions";
import { CheckIcon, ClockIcon, MissedIcon } from "./icons";
import { ListenButton } from "./ListenButton";
import { PillIcon, type PillShape } from "./PillIcon";
import { StatusChip } from "./StatusChip";

/**
 * Reminder screen (BUILD_PLAN Stage 2): the medicine, its time, the spoken instruction and
 * three big choices: Taken / Snooze / Missed. Built for one hand and a 70-year-old: 56px
 * buttons, icon + word, the medicine name and dose are the largest text on screen.
 */
export function ReminderSheet({
  reminderId,
  scheduledAt,
  time,
  name,
  strength,
  dose,
  instruction,
  pill,
  rate,
  alreadyLogged,
}: {
  reminderId: string;
  scheduledAt: string;
  time: string;
  name: string;
  strength: string;
  dose: string;
  instruction: string;
  pill: { shape: PillShape; color: string };
  rate: number;
  alreadyLogged: string | null;
}) {
  const t = tr("reminder");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(alreadyLogged);
  const [error, setError] = useState<string | null>(null);

  const act = (action: "taken" | "snoozed" | "missed") =>
    start(async () => {
      if (pending) return;
      setError(null);
      try {
        const res = await logDose(reminderId, scheduledAt, action);
        if (res.ok) setResult(res.status ?? action);
        else setError(t("notSaved"));
      } catch {
        setError(navigator.onLine ? t("notSaved") : t("notSavedOffline"));
      }
    });

  const btn = "flex min-h-14 w-full items-center justify-center gap-3 rounded-button text-lg font-semibold";

  return (
    <section className="rounded-card border-2 border-primary bg-surface p-5">
      <p className="label-mono">{t("label")}</p>
      <p className="mt-1 font-mono text-3xl font-medium text-ink">{time}</p>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <PillIcon shape={pill.shape} color={pill.color} size={56} />
        <div className="min-w-0 flex-[1_1_9rem] [overflow-wrap:break-word] [hyphens:manual]">
          <h1 className="text-2xl">
            {name} <span className="font-mono text-xl font-medium text-ink-2">{strength}</span>
          </h1>
          <p className="mt-1 font-mono text-xl">{dose}</p>
        </div>
      </div>
      <p className="mt-4 text-lg">{instruction}</p>
      <div className="mt-3">
        <ListenButton text={instruction} rate={rate} size="lg" label={t("listen")} autoPlay />
      </div>

      {result ? (
        <div className="mt-6 space-y-4">
          <StatusChip tone={result === "taken" || result === "late" ? "success" : "warning"}>{t(`logged.${result}`)}</StatusChip>
          <p className="text-base text-ink-2">{t(`loggedBody.${result}`)}</p>
          <button type="button" onClick={() => router.push("/home")} className="btn-primary w-full">
            {t("backHome")}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {error && (
            <p role="alert" className="text-base font-medium text-danger">
              {error}
            </p>
          )}
          <button type="button" aria-disabled={pending} onClick={() => act("taken")} className={`${btn} btn-primary ${pending ? "opacity-70" : ""}`}>
            <CheckIcon size={24} />
            {t("taken")}
          </button>
          <button type="button" aria-disabled={pending} onClick={() => act("snoozed")} className={`${btn} btn-outline`}>
            <ClockIcon size={24} />
            {t("snooze")}
          </button>
          <button type="button" aria-disabled={pending} onClick={() => act("missed")} className={`${btn} btn-outline`}>
            <MissedIcon size={24} />
            {t("missed")}
          </button>
        </div>
      )}
    </section>
  );
}
