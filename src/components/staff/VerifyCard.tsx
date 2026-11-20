"use client";

import { useActionState, useState } from "react";
import { tr, formatDate } from "@/lib/strings";
import { reviewEntry, type ReviewState } from "@/app/(staff)/verify/actions";
import type { PackRead } from "@/lib/ai/scan";
import type { WithFood } from "@/lib/db/types";
import type { DrugCheckResult } from "@/lib/drugcheck";
import { DosingFields, type Dosing } from "@/components/DosingFields";
import { DrugCheckChip } from "@/components/DrugCheckChip";
import { InteractionCards } from "@/components/InteractionCards";
import type { InteractionHit } from "@/lib/interactions";
import { CheckboxField } from "@/components/forms";
import { FormMessage, Textarea } from "@/components/forms";
import { PackReadCard } from "@/components/PackReadCard";
import { StatusChip } from "@/components/StatusChip";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionLabel } from "@/components/ui";

export type QueueEntry = {
  id: string;
  patient_id: string;
  patient_name: string;
  hospital_number: string | null;
  drug_name: string;
  strength: string | null;
  form: string | null;
  dose: string | null;
  frequency_per_day: number;
  duration_days: number | null;
  with_food: WithFood;
  quantity_dispensed: number | null;
  instructions: string | null;
  instructions_plain: string | null;
  nafdac_no: string | null;
  check_result: DrugCheckResult | null;
  expiry_date: string | null;
  batch_no: string | null;
  times: string[];
  pack_url: string | null;
  rx_url: string | null;
  pack: PackRead | null;
  created_at: string;
  interactions: InteractionHit[];
};

/**
 * One queue entry: photos, the reader's fields (with confidence) and the patient's typed entry
 * side by side, then Approve / Edit / Reject (reason required). Each is one form post to the
 * same action with a hidden intent; the card collapses to a result line when done.
 */
export function VerifyCard({ entry }: { entry: QueueEntry }) {
  const t = tr("verify");
  const td = tr("dosing");
  const [state, formAction] = useActionState(reviewEntry, undefined as ReviewState);
  const [mode, setMode] = useState<"view" | "edit" | "reject">("view");
  const [reviewed, setReviewed] = useState(false);
  const [dosing, setDosing] = useState<Dosing>({
    dose: entry.dose ?? "",
    frequency: entry.frequency_per_day,
    withFood: entry.with_food,
    duration: entry.duration_days ? String(entry.duration_days) : "",
    times: entry.times.length ? entry.times : ["08:00"],
    quantity: entry.quantity_dispensed ? String(entry.quantity_dispensed) : "",
  });

  const done = state?.done;

  if (done) {
    return (
      <FormMessage tone={done === "rejected" ? "info" : "success"}>
        <p className="font-semibold">{t(`done.${done}`, { name: entry.patient_name, drug: entry.drug_name })}</p>
      </FormMessage>
    );
  }

  const row = (label: string, value: string | null | undefined, mono = true) => (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5">
      <dt className="text-base text-ink-2">{label}</dt>
      <dd className={`${mono ? "font-mono" : ""} text-base font-medium [overflow-wrap:anywhere]`}>{value || "—"}</dd>
    </div>
  );

  return (
    <Card as="article" className="space-y-4" testId="verify-entry">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold [overflow-wrap:anywhere]">{entry.patient_name}</h2>
          <p className="font-mono text-sm text-ink-2">
            {entry.hospital_number ?? "—"} · {formatDate(new Date(entry.created_at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}
          </p>
        </div>
        <StatusChip tone="neutral">{t("pendingChip")}</StatusChip>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["pack", entry.pack_url],
          ["rx", entry.rx_url],
        ].map(([kind, url]) => (
          <figure key={kind} className="rounded-button border border-border bg-bg p-2">
            <figcaption className="label-mono mb-1">{t(`photos.${kind}`)}</figcaption>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage link */}
                <img src={url} alt={t(`photos.${kind}Alt`, { name: entry.patient_name })} className="max-h-72 w-full rounded-button object-contain" />
              </a>
            ) : (
              <p className="py-6 text-center text-sm text-ink-2">{t("photos.none")}</p>
            )}
          </figure>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-button border border-border p-3">
          {entry.pack ? <PackReadCard pack={entry.pack} title={t("aiTitle")} compact /> : <p className="text-sm text-ink-2">{t("aiNone")}</p>}
        </section>
        <section className="rounded-button border-2 border-primary p-3">
          <SectionLabel>{t("patientTitle")}</SectionLabel>
          <dl className="mt-2 divide-y divide-surface-2">
            {row(t("fields.drug"), `${entry.drug_name}${entry.strength ? ` ${entry.strength}` : ""}${entry.form ? ` · ${entry.form}` : ""}`, false)}
            {row(t("fields.dose"), entry.dose)}
            {row(t("fields.frequency"), td("perDay", { count: entry.frequency_per_day }), false)}
            {row(t("fields.times"), entry.times.join(" · "))}
            {row(t("fields.food"), td(`food.${entry.with_food}`), false)}
            {row(t("fields.duration"), entry.duration_days ? td("days", { count: entry.duration_days }) : t("fields.ongoing"), false)}
            {row(t("fields.quantity"), entry.quantity_dispensed ? String(entry.quantity_dispensed) : null)}
            {row(t("fields.asTold"), entry.instructions, false)}
          </dl>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DrugCheckChip result={entry.check_result} />
            {entry.nafdac_no && <span className="font-mono text-sm text-ink-2">{entry.nafdac_no}</span>}
            {entry.expiry_date && <span className="font-mono text-sm text-ink-2">· {t("fields.expiry")} {entry.expiry_date}</span>}
          </div>
          {entry.instructions_plain && <p className="mt-2 text-base text-ink-2">“{entry.instructions_plain}”</p>}
        </section>
      </div>

      {(() => {
        const hits = state?.interactions?.length ? state.interactions : entry.interactions;
        const major = hits.some((h) => h.severity === "major");
        return hits.length ? (
          <section className="space-y-3" data-testid="verify-interactions">
            <SectionLabel as="h3">{t("interactionsTitle")}</SectionLabel>
            <InteractionCards hits={hits} compact />
            {major && mode !== "reject" && (
              <CheckboxField id={`reviewed-${entry.id}`} name="reviewed" form={`approve-${entry.id}`} label={t("reviewed")} error={state?.error === "reviewRequired" ? t("errors.reviewRequired") : undefined} onChange={(e) => setReviewed(e.target.checked)} />
            )}
          </section>
        ) : null;
      })()}
      {state?.error && state.error !== "reviewRequired" && (
        <FormMessage tone="error">
          <p>{t(`errors.${state.error}`)}</p>
          {state.detail && <p className="mt-1 font-mono text-sm">{state.detail}</p>}
        </FormMessage>
      )}

      {mode === "view" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <form id={`approve-${entry.id}`} action={formAction} className="flex-1" data-testid="verify-approve">
            <input type="hidden" name="id" value={entry.id} />
            <input type="hidden" name="intent" value="approve" />
            <SubmitButton pendingLabel={t("working")} className="w-full">
              {t("approve")}
            </SubmitButton>
          </form>
          <button type="button" onClick={() => setMode("edit")} className="btn-outline flex-1">
            {t("edit")}
          </button>
          <button type="button" onClick={() => setMode("reject")} className="btn-outline flex-1">
            {t("reject")}
          </button>
        </div>
      )}

      {mode === "edit" && (
        <form action={formAction} className="space-y-4 rounded-button bg-bg p-3" noValidate>
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="intent" value="edit" />
          {reviewed && <input type="hidden" name="reviewed" value="on" />}
          <SectionLabel as="h3">{t("editTitle")}</SectionLabel>
          <DosingFields value={dosing} onChange={setDosing} errors={state?.fieldErrors} form={entry.form ?? ""} idPrefix={`edit-${entry.id.slice(0, 8)}`} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton pendingLabel={t("working")}>{t("saveEdit")}</SubmitButton>
            <button type="button" onClick={() => setMode("view")} className="btn-outline">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {mode === "reject" && (
        <form action={formAction} className="space-y-3 rounded-button bg-bg p-3" noValidate>
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="intent" value="reject" />
          <label htmlFor={`reason-${entry.id}`} className="block text-base font-medium">
            {t("reasonLabel")}
          </label>
          <p className="text-sm text-ink-2">{t("reasonHint")}</p>
          <Textarea id={`reason-${entry.id}`} name="reason" rows={3} maxLength={300} invalid={Boolean(state?.fieldErrors?.reason)} aria-describedby={state?.fieldErrors?.reason ? `reason-${entry.id}-error` : undefined} />
          {state?.fieldErrors?.reason && (
            <p id={`reason-${entry.id}-error`} className="text-base font-medium text-danger">
              {t("errors.reasonRequired")}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton pendingLabel={t("working")}>{t("confirmReject")}</SubmitButton>
            <button type="button" onClick={() => setMode("view")} className="btn-outline">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
