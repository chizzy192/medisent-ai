"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { tr } from "@/lib/strings";
import { dispense, type DispenseState } from "@/app/(staff)/dispense/actions";
import type { FormularyDrug } from "@/lib/formulary";
import { DosingFields, emptyDosing, type Dosing } from "@/components/DosingFields";
import { DrugPicker } from "@/components/DrugPicker";
import { Field, FormMessage, Input } from "@/components/forms";
import type { PillShape } from "@/components/PillIcon";
import { PillPicker } from "@/components/PillPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionLabel } from "@/components/ui";

/** Dispensing form: formulary pick → dosing as prescribed → supply → what it looks like. */
export function DispenseForm({ patientId, patientName }: { patientId: string; patientName: string }) {
  const t = tr("dispense");
  const [state, formAction] = useActionState(dispense, undefined as DispenseState);
  const [drug, setDrug] = useState<FormularyDrug | null>(null);
  const [dosing, setDosing] = useState<Dosing>(emptyDosing());
  const [shape, setShape] = useState<PillShape>("round");
  const [colour, setColour] = useState("#FFFFFF");
  const errors = state?.fieldErrors ?? {};

  if (state?.savedId) {
    return (
      <div className="space-y-4">
        <FormMessage tone="success">
          <p className="font-semibold">{t("saved", { name: state.patientName ?? patientName })}</p>
          <p className="mt-1">{state.instruction}</p>
        </FormMessage>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/dispense?patient=${patientId}`} className="btn-primary">
            {t("another")}
          </Link>
          <Link href={`/patients/${patientId}`} className="btn-outline">
            {t("viewPatient")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="drugId" value={drug?.id ?? ""} />
      <input type="hidden" name="pillShape" value={shape} />
      <input type="hidden" name="pillColor" value={colour} />
      {state?.error && <FormMessage tone="error">{t(`errors.${state.error}`)}</FormMessage>}

      <Card as="section" className="space-y-3">
        <SectionLabel as="h2">{t("sectionDrug")}</SectionLabel>
        <DrugPicker value={drug} onChange={setDrug} label={t("findDrug")} />
        {errors.drug && <FormMessage tone="error">{t("errors.drugRequired")}</FormMessage>}
      </Card>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionDosing")}</SectionLabel>
        <DosingFields value={dosing} onChange={setDosing} errors={errors} form={drug?.form ?? ""} idPrefix="dispense" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("instructionsRaw")} htmlFor="instructionsRaw" hint={t("instructionsRawHint")}>
            <Input id="instructionsRaw" name="instructionsRaw" placeholder="1 tab b.d. p.c." className="font-mono" />
          </Field>
          <Field label={t("batchNo")} htmlFor="batchNo">
            <Input id="batchNo" name="batchNo" autoCapitalize="characters" className="font-mono" />
          </Field>
        </div>
      </Card>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionLooks")}</SectionLabel>
        <PillPicker shape={shape} color={colour} onShape={setShape} onColor={setColour} />
      </Card>

      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
