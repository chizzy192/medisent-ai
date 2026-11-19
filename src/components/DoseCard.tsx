"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { logDose } from "@/app/(patient)/home/actions";
import type { Locale } from "@/config/locales";
import { CheckIcon } from "./icons";
import { ListenButton } from "./ListenButton";
import { MedicineCard, type DoseState } from "./MedicineCard";
import type { PillShape } from "./PillIcon";
import type { ChipTone } from "./StatusChip";

export type DoseItem = {
  reminderId: string;
  prescriptionId: string;
  scheduledAt: string;
  time: string;
  name: string;
  strength: string;
  dose: string;
  instruction: string;
  pill: { shape: PillShape; color: string };
  state: DoseState;
  daysLeft: number | null;
};

const chipTone: Record<DoseState, ChipTone> = { taken: "success", now: "primary", later: "neutral", late: "warning", missed: "warning", snoozed: "warning" };

/**
 * One dose on the day timeline (signature element 2). The "now" (or late) card carries the big
 * "I took it" button; on tap it turns success with a check, then the card settles into its
 * taken state (250 ms; instant under reduced motion). Colour is never the only signal.
 */
export function DoseCard({ item, locale, rate }: { item: DoseItem; locale: Locale; rate: number }) {
  const t = useTranslations("home");
  const [state, setState] = useState<DoseState>(item.state);
  const [flash, setFlash] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actionable = state === "now" || state === "late" || state === "snoozed";

  const act = (action: "taken" | "snoozed" | "missed") =>
    start(async () => {
      if (pending) return;
      setError(null);
      try {
        const res = await logDose(item.reminderId, item.scheduledAt, action);
        if (!res.ok) return setError(t("notSaved"));
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (action === "taken" && !reduce) {
          setFlash(true);
          setTimeout(() => {
            setFlash(false);
            setState("taken");
          }, 250);
        } else setState(action === "taken" ? "taken" : action);
      } catch {
        setError(navigator.onLine ? t("notSaved") : t("notSavedOffline"));
      }
    });

  const label = t(`dose.${state}`);
  const supply = item.daysLeft !== null && item.daysLeft <= 3 ? t("daysLeft", { count: Math.max(0, item.daysLeft) }) : null;

  return (
    <div className={`transition-[opacity,transform] duration-250 motion-reduce:transition-none ${flash ? "scale-[0.99] motion-reduce:scale-100" : ""}`}>
      <MedicineCard
        name={item.name}
        strength={item.strength}
        time={item.time}
        dose={item.dose}
        pill={item.pill}
        state={state}
        status={{ tone: chipTone[state], label }}
        actions={
          actionable ? (
            <>
              <button type="button" aria-disabled={pending} onClick={() => act("taken")} className={`btn-primary ${flash ? "!bg-success" : ""} ${pending ? "opacity-70" : ""}`}>
                <CheckIcon size={22} />
                {flash ? t("dose.taken") : t("tookIt")}
              </button>
              <button type="button" aria-disabled={pending} onClick={() => act("snoozed")} className="btn-outline">
                {t("later")}
              </button>
              {state === "late" && (
                <button type="button" aria-disabled={pending} onClick={() => act("missed")} className="btn-outline">
                  {t("missedIt")}
                </button>
              )}
            </>
          ) : undefined
        }
        footer={
          <div className="space-y-2">
            {error && (
              <p role="alert" className="text-base font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ListenButton text={item.instruction} locale={locale} rate={rate} />
              {supply && <span className="font-mono text-base text-warning">{supply}</span>}
            </div>
          </div>
        }
      />
    </div>
  );
}
