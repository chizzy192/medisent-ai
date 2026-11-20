"use client";

import { useState } from "react";
import { tr } from "@/lib/strings";
import { saveAccessibility } from "@/app/(patient)/me/actions";
import { SPEECH_RATES, TEXT_SIZES, type TextSize } from "@/lib/accessibility";
import { ListenButton } from "./ListenButton";
import { SubmitButton } from "./SubmitButton";

/**
 * Me → Accessibility (BUILD_PLAN Stage 2): three text sizes, high contrast, speech speed.
 * Every choice is a large labelled radio; the sample sentence lets the person hear the speed.
 */
export function AccessibilityForm({ textSize, highContrast, speechRate, sample }: { textSize: TextSize; highContrast: boolean; speechRate: number; sample: string }) {
  const t = tr("access");
  const [rate, setRate] = useState(speechRate);
  const radio = (checked: boolean) => `flex min-h-12 cursor-pointer items-center gap-3 rounded-button border px-3 ${checked ? "border-primary bg-primary-tint" : "border-border bg-surface"}`;

  return (
    <form action={saveAccessibility} className="space-y-5">
      <fieldset>
        <legend className="text-base font-medium">{t("textSize")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TEXT_SIZES.map((size) => (
            <label key={size} className={radio(false)}>
              <input type="radio" name="textSize" value={size} defaultChecked={size === textSize} className="size-5 accent-primary" />
              <span className={size === "large" ? "text-[1.25em]" : size === "larger" ? "text-[1.5em]" : ""}>{t(`sizes.${size}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={radio(false)}>
        <input type="checkbox" name="highContrast" defaultChecked={highContrast} className="size-5 accent-primary" />
        <span>
          <span className="block text-base font-medium">{t("highContrast")}</span>
          <span className="block text-sm text-ink-2">{t("highContrastHint")}</span>
        </span>
      </label>

      <fieldset>
        <legend className="text-base font-medium">{t("speechRate")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {SPEECH_RATES.map((r) => (
            <label key={r} className={radio(rate === r)}>
              <input type="radio" name="speechRate" value={r} checked={rate === r} onChange={() => setRate(r)} className="size-5 accent-primary" />
              <span>{t(`rates.${String(r).replace(".", "_")}`)}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <ListenButton text={sample} rate={rate} label={t("trySpeed")} />
        </div>
      </fieldset>

      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
