"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { addPrescription, type AddState } from "@/app/(staff)/patients/actions";
import type { PillShape } from "@/components/PillIcon";
import { Field, FormMessage, Input, Select } from "@/components/forms";
import { PillPicker } from "@/components/PillPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionLabel } from "@/components/ui";
import { defaultTimes } from "@/lib/reminders";

/** Staff: add a prescription for a patient of their hospital (BUILD_PLAN Stage 2). */
export function AddPrescriptionForm({ patientId, patientName }: { patientId: string; patientName: string }) {
  const t = useTranslations("staffPrescription");
  const [state, formAction] = useActionState(addPrescription, undefined as AddState);
  const [frequency, setFrequency] = useState(1);
  const [shape, setShape] = useState<PillShape>("round");
  const [colour, setColour] = useState("#FFFFFF");
  const err = (k: string) => (state?.fieldErrors?.[k] ? t(`errors.${state.fieldErrors[k]}`) : undefined);

  if (state?.savedId) {
    return (
      <FormMessage tone="success">
        <p className="font-semibold">{t("saved", { name: patientName })}</p>
        <p className="mt-1">{state.instruction}</p>
      </FormMessage>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="pillShape" value={shape} />
      <input type="hidden" name="pillColor" value={colour} />
      {state?.error && <FormMessage tone="error">{t(`errors.${state.error}`)}</FormMessage>}

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionMedicine")}</SectionLabel>
        <Field label={t("drugName")} htmlFor="drugName" error={err("drugName")}>
          <Input id="drugName" name="drugName" invalid={Boolean(err("drugName"))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("strength")} htmlFor="strength">
            <Input id="strength" name="strength" placeholder="500 mg" className="font-mono" />
          </Field>
          <Field label={t("form")} htmlFor="form">
            <Input id="form" name="form" placeholder="tablet" />
          </Field>
          <Field label={t("dose")} htmlFor="dose" error={err("dose")}>
            <Input id="dose" name="dose" placeholder="1 tablet" invalid={Boolean(err("dose"))} className="font-mono" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("frequency")} htmlFor="frequency" error={err("frequency")}>
            <Select id="frequency" name="frequency" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {t("perDay", { count: n })}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("withFood")} htmlFor="withFood">
            <Select id="withFood" name="withFood" defaultValue="any">
              {["any", "before", "after", "with"].map((v) => (
                <option key={v} value={v}>
                  {t(`food.${v}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("duration")} htmlFor="duration">
            <Input id="duration" name="duration" type="number" min={1} max={365} inputMode="numeric" className="font-mono" />
          </Field>
        </div>
        <fieldset>
          <legend className="text-base font-medium">{t("times")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {defaultTimes(frequency).map((time, i) => (
              <input key={`${frequency}-${i}`} type="time" name="times" defaultValue={time} aria-label={t("timeN", { n: i + 1 })} className="min-h-12 rounded-button border border-border bg-surface px-3 font-mono text-lg" />
            ))}
          </div>
        </fieldset>
      </Card>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionSupply")}</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("quantity")} htmlFor="quantity" hint={t("quantityHint")}>
            <Input id="quantity" name="quantity" type="number" min={1} max={1000} inputMode="numeric" className="font-mono" />
          </Field>
          <Field label={t("nafdac")} htmlFor="nafdacNo" hint={t("nafdacHint")}>
            <Input id="nafdacNo" name="nafdacNo" placeholder="A4-1234" autoCapitalize="characters" className="font-mono" />
          </Field>
        </div>
        <Field label={t("instructionsRaw")} htmlFor="instructionsRaw" hint={t("instructionsRawHint")}>
          <Input id="instructionsRaw" name="instructionsRaw" placeholder="1 tab b.d. p.c." className="font-mono" />
        </Field>
      </Card>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionLooks")}</SectionLabel>
        <PillPicker shape={shape} color={colour} onShape={setShape} onColor={setColour} />
      </Card>

      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
