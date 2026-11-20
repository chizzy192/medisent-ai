"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { tr } from "@/lib/strings";
import type { ScanResponse } from "@/app/api/scan/route";
import { addMyMedicine } from "@/app/(patient)/add/actions";
import { previewInteractions } from "@/app/formulary/actions";
import type { InteractionHit } from "@/lib/interactions";
import { InteractionCards } from "@/components/InteractionCards";
import type { FormularyDrug } from "@/lib/formulary";
import { DosingFields, emptyDosing, type Dosing } from "@/components/DosingFields";
import { DrugCheckChip, DrugCheckNote } from "@/components/DrugCheckChip";
import { DrugPicker } from "@/components/DrugPicker";
import { FormMessage } from "@/components/forms";
import { PackReadCard } from "@/components/PackReadCard";
import { PhotoInput } from "@/components/PhotoInput";
import type { PillShape } from "@/components/PillIcon";
import { PillPicker } from "@/components/PillPicker";
import { StatusChip } from "@/components/StatusChip";
import { Card, SectionLabel } from "@/components/ui";

type Step = "photos" | "reading" | "pick" | "dosing";

/**
 * "Add a medicine" (BUILD_PLAN "Patient self-add"): 1 photos (pack required, prescription
 * optional) → the reader pre-fills the printed fields with a confidence each → 2 the patient
 * picks the medicine from the formulary (suggestions first) → 3 types the dose as told by the
 * pharmacist → saved as pending with a grey "Not checked yet" badge. The AI never fills the dose.
 */
export function AddMedicineFlow({ rate, hasHospital }: { rate: number; hasHospital: boolean }) {
  const t = tr("add");
  const router = useRouter();
  const [step, setStep] = useState<Step>("photos");
  const [pack, setPack] = useState<File | null>(null);
  const [rx, setRx] = useState<File | null>(null);
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [drug, setDrug] = useState<FormularyDrug | null>(null);
  const [dosing, setDosing] = useState<Dosing>(emptyDosing());
  const [shape, setShape] = useState<PillShape>("round");
  const [colour, setColour] = useState("#FFFFFF");
  const [asTold, setAsTold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [hits, setHits] = useState<InteractionHit[]>([]);
  useEffect(() => {
    if (!drug) return;
    let active = true;
    previewInteractions(drug.id).then((h) => active && setHits(h)).catch(() => active && setHits([]));
    return () => {
      active = false;
    };
  }, [drug]);

  async function read() {
    if (!pack) return;
    setReadError(null);
    setStep("reading");
    const body = new FormData();
    body.append("image", pack, pack.name || "pack.jpg");
    try {
      const res = await fetch("/api/scan", { method: "POST", body, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setReadError(json.error === "image_too_big" ? "tooBig" : navigator.onLine ? "readerFailed" : "offline");
      } else {
        const json = (await res.json()) as ScanResponse;
        setScan(json);
        if (json.formulary.length === 1 && json.pack.drug_name.confidence >= 0.8) setDrug(json.formulary[0]);
      }
    } catch {
      setReadError(navigator.onLine ? "readerFailed" : "offline");
    }
    setStep("pick");
  }

  function save() {
    setError(null);
    setFieldErrors({});
    if (!drug) return setError("drugRequired");
    if (!pack) return setError("packRequired");
    const fd = new FormData();
    fd.append("pack", pack);
    if (rx) fd.append("rx", rx);
    fd.append("drugId", drug.id);
    fd.append("dose", dosing.dose);
    fd.append("frequency", String(dosing.frequency));
    fd.append("withFood", dosing.withFood);
    fd.append("duration", dosing.duration);
    dosing.times.forEach((x) => fd.append("times", x));
    fd.append("quantity", dosing.quantity);
    fd.append("pillShape", shape);
    fd.append("pillColor", colour);
    fd.append("asTold", asTold);
    fd.append("aiPrefill", JSON.stringify(scan ? { pack: scan.pack, check: scan.check, read_at: new Date().toISOString() } : null));
    start(async () => {
      try {
        const res = await addMyMedicine(fd);
        if (!res.ok) {
          setError(res.error);
          setFieldErrors(res.fieldErrors ?? {});
          return;
        }
        router.push(`/home?added=${res.saved.id}${res.interactions.length ? "&interaction=1" : ""}`);
      } catch {
        setError("server");
      }
    });
  }

  const stepNo = step === "photos" || step === "reading" ? 1 : step === "pick" ? 2 : 3;

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>{t("stepLabel", { step: stepNo, total: 3 })}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t(`titles.${step}`)}</h1>
        <p className="mt-1 text-base text-ink-2">{t(`intros.${step}`)}</p>
      </div>

      {(step === "photos" || step === "reading") && (
        <div className="space-y-4">
          <PhotoInput label={t("packPhoto")} hint={t("packPhotoHint")} required file={pack} onChange={setPack} testId="pack-photo" />
          <PhotoInput label={t("rxPhoto")} hint={t("rxPhotoHint")} file={rx} onChange={setRx} testId="rx-photo" />
          {step === "reading" ? (
            <p role="status" className="flex min-h-12 items-center gap-3 text-base text-ink-2">
              <StatusChip tone="primary">
                <span className="font-mono">{t("reading")}</span>
              </StatusChip>
            </p>
          ) : (
            <button type="button" onClick={read} disabled={!pack} className="btn-primary w-full disabled:opacity-60" data-testid="add-read">
              {t("readPack")}
            </button>
          )}
        </div>
      )}

      {step === "pick" && (
        <div className="space-y-4">
          {readError && <FormMessage tone="info">{t(`readErrors.${readError}`)}</FormMessage>}
          {scan && <PackReadCard pack={scan.pack} />}
          {scan?.check && (
            <Card as="section" className="space-y-2">
              <DrugCheckChip result={scan.check.result} />
              <DrugCheckNote result={scan.check.result} listedName={scan.check.listedName} listedStrength={scan.check.listedStrength} manufacturer={scan.check.manufacturer} typedName={scan.pack.drug_name.value ?? ""} typedStrength={scan.pack.strength.value ?? ""} />
            </Card>
          )}
          {scan?.expired && <FormMessage tone="error">{t("expired", { date: scan.pack.expiry_date.value ?? "" })}</FormMessage>}
          <Card as="section" className="space-y-3">
            <SectionLabel as="h2">{t("pickTitle")}</SectionLabel>
            <DrugPicker value={drug} onChange={(d) => { setDrug(d); setHits([]); }} suggestions={scan?.formulary ?? []} initialQuery={scan?.pack.drug_name.value?.split(" ")[0] ?? ""} />
          </Card>
          {drug && hits.length > 0 && (
            <Card as="section" className="space-y-3" testId="add-interactions">
              <SectionLabel as="h2">{t("interactionsTitle")}</SectionLabel>
              <InteractionCards hits={hits} rate={rate} />
              <p className="text-base text-ink-2">{t("interactionsNote")}</p>
            </Card>
          )}
          {error === "drugRequired" && <FormMessage tone="error">{t("errors.drugRequired")}</FormMessage>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (!drug) return setError("drugRequired");
                setError(null);
                setStep("dosing");
              }}
              className="btn-primary flex-1"
              data-testid="add-continue"
            >
              {t("continue")}
            </button>
            <button type="button" onClick={() => setStep("photos")} className="btn-outline flex-1">
              {t("backPhotos")}
            </button>
          </div>
        </div>
      )}

      {step === "dosing" && drug && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Card as="section" className="space-y-2">
            <SectionLabel as="h2">{t("medicine")}</SectionLabel>
            <p className="text-lg font-semibold">
              {drug.name} <span className="font-mono text-base font-medium text-ink-2">{drug.strength}</span>
            </p>
            <p className="text-sm text-ink-2">{drug.form}</p>
          </Card>
          <Card as="section" className="space-y-4">
            <SectionLabel as="h2">{t("dosingTitle")}</SectionLabel>
            <p className="text-base text-ink-2">{t("dosingIntro")}</p>
            <DosingFields value={dosing} onChange={setDosing} errors={fieldErrors} form={drug.form ?? ""} rate={rate} />
            <div>
              <label htmlFor="asTold" className="block text-base font-medium">
                {t("asTold")}
              </label>
              <p id="asTold-hint" className="mt-0.5 text-sm text-ink-2">
                {t("asToldHint")}
              </p>
              <textarea id="asTold" value={asTold} onChange={(e) => setAsTold(e.target.value)} rows={2} maxLength={300} aria-describedby="asTold-hint" className="mt-1.5 block w-full rounded-button border border-border bg-surface px-3 py-2 text-base" />
            </div>
          </Card>
          <Card as="section" className="space-y-4">
            <SectionLabel as="h2">{t("looks")}</SectionLabel>
            <PillPicker shape={shape} color={colour} onShape={setShape} onColor={setColour} />
          </Card>
          <FormMessage tone="info">{hasHospital ? t("pendingNote") : t("pendingNoteIndependent")}</FormMessage>
          {error && error !== "drugRequired" && <FormMessage tone="error">{t(`errors.${error}`)}</FormMessage>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={pending} aria-busy={pending} className="btn-primary flex-1 disabled:opacity-70" data-testid="add-save">
              {pending ? t("saving") : t("save")}
            </button>
            <button type="button" onClick={() => setStep("pick")} disabled={pending} className="btn-outline flex-1">
              {t("backPick")}
            </button>
          </div>
        </form>
      )}

      <p className="text-sm text-ink-2">
        <Link href="/scan" className="underline">
          {t("scanInstead")}
        </Link>
      </p>
    </div>
  );
}
