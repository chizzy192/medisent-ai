"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ScanResponse } from "@/app/api/scan/route";
import { checkNafdac, saveScannedPrescription, type ConfirmInput } from "@/app/(patient)/scan/actions";
import type { Locale } from "@/config/locales";
import type { WithFood } from "@/lib/ai/scan";
import type { DrugCheck } from "@/lib/drugcheck";
import { buildInstruction } from "@/lib/instructions";
import { defaultTimes } from "@/lib/reminders";
import { DrugCheckChip, DrugCheckNote } from "@/components/DrugCheckChip";
import { Field, FormMessage, Input, Select, describedBy } from "@/components/forms";
import { ListenButton } from "@/components/ListenButton";
import { PillPicker } from "@/components/PillPicker";
import { StatusChip } from "@/components/StatusChip";
import { Card, SectionLabel } from "@/components/ui";
import type { PillShape } from "@/components/PillIcon";

/**
 * Confirm screen (BUILD_PLAN Stage 2): every scanned field is editable, the reminder times are
 * editable, the patient says what the medicine looks like, how many they got, and hears the
 * plain-language instruction before saving. The NAFDAC check runs live as the number changes.
 */
export function ConfirmForm({ scan, locale, rate, onBack }: { scan: ScanResponse; locale: Locale; rate: number; onBack: () => void }) {
  const t = useTranslations("confirm");
  const tScan = useTranslations("scan");
  const router = useRouter();
  const s = scan.scan;
  const [form, setForm] = useState<ConfirmInput>({
    drug_name: s.drug_name,
    strength: s.strength,
    form: s.form,
    dose: s.dose,
    frequency_per_day: s.frequency_per_day,
    duration_days: s.duration_days,
    with_food: s.with_food,
    times: scan.suggestion.times,
    pill_shape: scan.suggestion.pill_shape ?? "round",
    pill_color: s.pill_color ?? "#FFFFFF",
    quantity_dispensed: null,
    nafdac_no: s.nafdac_no,
    manufacturer: s.manufacturer,
    instructions_raw: s.instructions_raw,
    warnings: s.warnings_on_label,
  });
  const [check, setCheck] = useState<DrugCheck | null>(scan.check);
  const [checking, setChecking] = useState<"idle" | "busy" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ConfirmInput>(k: K, v: ConfirmInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Re-check the registration list when the typed NAFDAC number settles.
  useEffect(() => {
    const no = form.nafdac_no?.trim() ?? "";
    let active = true;
    const id = setTimeout(() => {
      if (!no) {
        setCheck(null);
        setChecking("idle");
        return;
      }
      setChecking("busy");
      checkNafdac(no, form.drug_name, form.strength)
        .then((res) => {
          if (!active) return;
          setCheck(res);
          setChecking("idle");
        })
        .catch(() => {
          if (!active) return;
          setChecking("failed");
        });
    }, no ? 500 : 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [form.nafdac_no, form.drug_name, form.strength]);

  const instruction = useMemo(
    () => buildInstruction({ dose: form.dose, form: form.form, frequency_per_day: form.times.length, duration_days: form.duration_days, with_food: form.with_food, times: form.times }, locale),
    [form, locale],
  );

  function setFrequency(n: number) {
    setForm((f) => ({ ...f, frequency_per_day: n, times: defaultTimes(n) }));
  }

  function submit() {
    setError(null);
    const local = !form.drug_name.trim() ? "nameRequired" : !form.dose.trim() ? "doseRequired" : form.times.length === 0 ? "timesRequired" : null;
    if (local) {
      setError(local);
      document.getElementById(local === "nameRequired" ? "drug_name" : local === "doseRequired" ? "dose" : "times-hint")?.scrollIntoView({ block: "center" });
      return;
    }
    start(async () => {
      try {
        const res = await saveScannedPrescription(form);
        if (!res.ok) return setError(res.error);
        router.push(`/home?saved=${res.saved.id}`);
      } catch {
        setError("server");
      }
    });
  }

  const fieldErr = (k: string) => (error === k ? t(`errors.${k}`) : undefined);

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <SectionLabel>{tScan("stepLabel", { step: 2, total: 2 })}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-1 text-base text-ink-2">{t("intro")}</p>
      </div>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionMedicine")}</SectionLabel>
        <Field label={t("drugName")} htmlFor="drug_name" error={fieldErr("nameRequired")}>
          <Input id="drug_name" value={form.drug_name} onChange={(e) => set("drug_name", e.target.value)} invalid={error === "nameRequired"} className="text-lg font-semibold" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("strength")} htmlFor="strength" hint={t("strengthHint")}>
            <Input id="strength" value={form.strength} onChange={(e) => set("strength", e.target.value)} className="font-mono" />
          </Field>
          <Field label={t("form")} htmlFor="form">
            <Input id="form" value={form.form} onChange={(e) => set("form", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionHow")}</SectionLabel>
        <Field label={t("dose")} htmlFor="dose" hint={t("doseHint")} error={fieldErr("doseRequired")}>
          <Input id="dose" value={form.dose} onChange={(e) => set("dose", e.target.value)} invalid={error === "doseRequired"} className="font-mono text-lg" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("frequency")} htmlFor="frequency">
            <Select id="frequency" value={form.frequency_per_day} onChange={(e) => setFrequency(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {t("perDay", { count: n })}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("withFood")} htmlFor="withFood">
            <Select id="withFood" value={form.with_food} onChange={(e) => set("with_food", e.target.value as WithFood)}>
              {(["any", "before", "after", "with"] as WithFood[]).map((v) => (
                <option key={v} value={v}>
                  {t(`food.${v}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("duration")} htmlFor="duration" hint={t("durationHint")}>
          <Input id="duration" type="number" inputMode="numeric" min={1} max={365} value={form.duration_days ?? ""} onChange={(e) => set("duration_days", e.target.value ? Number(e.target.value) : null)} className="font-mono" />
        </Field>
        <fieldset>
          <legend className="text-base font-medium">{t("times")}</legend>
          <p id="times-hint" className="mt-0.5 text-sm text-ink-2">
            {t("timesHint")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {form.times.map((time, i) => (
              <input
                key={i}
                type="time"
                value={time}
                aria-label={t("timeN", { n: i + 1 })}
                aria-describedby="times-hint"
                onChange={(e) => set("times", form.times.map((x, j) => (j === i ? e.target.value : x)))}
                className="min-h-12 rounded-button border border-border bg-surface px-3 font-mono text-lg"
              />
            ))}
          </div>
          {fieldErr("timesRequired") && <p className="mt-1 text-base font-medium text-danger">{fieldErr("timesRequired")}</p>}
        </fieldset>
        <div className="rounded-button bg-primary-tint p-3">
          <p className="label-mono text-primary">{t("willSay")}</p>
          <p className="mt-1 text-lg">{instruction}</p>
          <div className="mt-2">
            <ListenButton text={instruction} locale={locale} rate={rate} />
          </div>
        </div>
      </Card>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionLooks")}</SectionLabel>
        <p className="text-base text-ink-2">{t("looksIntro")}</p>
        <PillPicker shape={form.pill_shape} color={form.pill_color} onShape={(v: PillShape) => set("pill_shape", v)} onColor={(v) => set("pill_color", v)} />
      </Card>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionSupply")}</SectionLabel>
        <Field label={t("quantity")} htmlFor="quantity" hint={t("quantityHint")}>
          <Input id="quantity" type="number" inputMode="numeric" min={1} max={1000} value={form.quantity_dispensed ?? ""} onChange={(e) => set("quantity_dispensed", e.target.value ? Number(e.target.value) : null)} className="font-mono text-lg" aria-describedby={describedBy("quantity", { hint: true })} />
        </Field>
      </Card>

      <Card as="section" className="space-y-4">
        <SectionLabel as="h2">{t("sectionCheck")}</SectionLabel>
        <Field label={t("nafdac")} htmlFor="nafdac" hint={t("nafdacHint")}>
          <Input id="nafdac" value={form.nafdac_no ?? ""} onChange={(e) => set("nafdac_no", e.target.value.toUpperCase())} placeholder="A4-1234" className="font-mono text-lg" autoCapitalize="characters" aria-describedby={describedBy("nafdac", { hint: true })} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          {checking === "busy" ? (
            <StatusChip tone="neutral">{t("checking")}</StatusChip>
          ) : checking === "failed" ? (
            <StatusChip tone="neutral">{t("checkFailed")}</StatusChip>
          ) : (
            <DrugCheckChip result={check?.result ?? null} />
          )}
        </div>
        {checking === "failed" && <p className="text-base text-ink-2">{t("checkFailedNote")}</p>}
        {checking === "idle" && (
          <DrugCheckNote result={check?.result ?? null} listedName={check?.listedName} listedStrength={check?.listedStrength} manufacturer={check?.manufacturer} typedName={form.drug_name} typedStrength={form.strength} />
        )}
        {form.warnings.length > 0 && (
          <div>
            <p className="label-mono">{t("warnings")}</p>
            <ul className="mt-1 list-inside list-disc text-base text-ink-2">
              {form.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {error && <FormMessage tone="error">{t(`errors.${error}`)}</FormMessage>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={pending} aria-busy={pending} data-testid="confirm-save" className="btn-primary flex-1 disabled:opacity-70">
          {pending ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={onBack} disabled={pending} className="btn-outline flex-1">
          {t("back")}
        </button>
      </div>
    </form>
  );
}
