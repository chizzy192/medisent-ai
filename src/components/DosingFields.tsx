"use client";

import { useState } from "react";
import { tr } from "@/lib/strings";
import type { WithFood } from "@/lib/db/types";
import { buildInstruction } from "@/lib/instructions";
import { defaultTimes } from "@/lib/reminders";
import { Field, Input, Select, describedBy } from "@/components/forms";
import { ListenButton } from "@/components/ListenButton";

export type Dosing = { dose: string; frequency: number; withFood: WithFood; duration: string; times: string[]; quantity: string };

export function emptyDosing(): Dosing {
  return { dose: "", frequency: 1, withFood: "any", duration: "", times: defaultTimes(1), quantity: "" };
}

/**
 * The dosing entry a person types (never the AI): dose, how often, food, days, reminder times
 * and quantity. Used by the patient's "Add a medicine", the pharmacist's "Dispense" and the
 * verification queue's "Edit". Emits hidden inputs so a plain form action receives it, and
 * reads the plain-English sentence out loud so the person hears what the app will say.
 */
export function DosingFields({
  value,
  onChange,
  errors = {},
  form = "",
  rate = 1,
  idPrefix = "dosing",
  showQuantity = true,
}: {
  value: Dosing;
  onChange: (v: Dosing) => void;
  errors?: Record<string, string | undefined>;
  form?: string;
  rate?: number;
  idPrefix?: string;
  showQuantity?: boolean;
}) {
  const t = tr("dosing");
  const [touchedTimes, setTouchedTimes] = useState(false);
  const set = <K extends keyof Dosing>(k: K, v: Dosing[K]) => onChange({ ...value, [k]: v });
  const setFrequency = (n: number) => onChange({ ...value, frequency: n, times: touchedTimes ? value.times.slice(0, n).concat(defaultTimes(n).slice(value.times.length)) : defaultTimes(n) });
  const id = (s: string) => `${idPrefix}-${s}`;
  const instruction = value.dose.trim()
    ? buildInstruction({ dose: value.dose, form, frequency_per_day: value.times.length, duration_days: Number(value.duration) || null, with_food: value.withFood, times: value.times })
    : null;

  return (
    <div className="space-y-4">
      <input type="hidden" name="frequency" value={value.frequency} />
      <input type="hidden" name="withFood" value={value.withFood} />
      {value.times.map((time, i) => (
        <input key={i} type="hidden" name="times" value={time} />
      ))}

      <Field label={t("dose")} htmlFor={id("dose")} hint={t("doseHint")} error={errors.dose ? t(`errors.${errors.dose}`) : undefined}>
        <Input id={id("dose")} name="dose" value={value.dose} onChange={(e) => set("dose", e.target.value)} placeholder="1 tablet" invalid={Boolean(errors.dose)} className="font-mono text-lg" aria-describedby={describedBy(id("dose"), { hint: true, error: Boolean(errors.dose) })} data-testid="dose" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("frequency")} htmlFor={id("frequency")} error={errors.frequency ? t(`errors.${errors.frequency}`) : undefined}>
          <Select id={id("frequency")} value={value.frequency} onChange={(e) => setFrequency(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {t("perDay", { count: n })}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("withFood")} htmlFor={id("food")}>
          <Select id={id("food")} value={value.withFood} onChange={(e) => set("withFood", e.target.value as WithFood)}>
            {(["any", "before", "after", "with"] as WithFood[]).map((v) => (
              <option key={v} value={v}>
                {t(`food.${v}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("duration")} htmlFor={id("duration")} hint={t("durationHint")}>
        <Input id={id("duration")} name="duration" type="number" inputMode="numeric" min={1} max={365} value={value.duration} onChange={(e) => set("duration", e.target.value)} className="font-mono" />
      </Field>
      <fieldset>
        <legend className="text-base font-medium">{t("times")}</legend>
        <p id={id("times-hint")} className="mt-0.5 text-sm text-ink-2">
          {t("timesHint")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {value.times.map((time, i) => (
            <input
              key={i}
              type="time"
              value={time}
              aria-label={t("timeN", { n: i + 1 })}
              aria-describedby={id("times-hint")}
              onChange={(e) => {
                setTouchedTimes(true);
                set("times", value.times.map((x, j) => (j === i ? e.target.value : x)));
              }}
              className="min-h-12 rounded-button border border-border bg-surface px-3 font-mono text-lg"
            />
          ))}
        </div>
      </fieldset>
      {showQuantity && (
        <Field label={t("quantity")} htmlFor={id("quantity")} hint={t("quantityHint")}>
          <Input id={id("quantity")} name="quantity" type="number" inputMode="numeric" min={1} max={1000} value={value.quantity} onChange={(e) => set("quantity", e.target.value)} className="font-mono text-lg" aria-describedby={describedBy(id("quantity"), { hint: true })} data-testid="quantity" />
        </Field>
      )}
      {instruction && (
        <div className="rounded-button bg-primary-tint p-3">
          <p className="label-mono text-primary">{t("willSay")}</p>
          <p className="mt-1 text-lg">{instruction}</p>
          <div className="mt-2">
            <ListenButton text={instruction} rate={rate} />
          </div>
        </div>
      )}
    </div>
  );
}
