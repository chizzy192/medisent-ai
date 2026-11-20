"use client";

import { useActionState, useState, useTransition } from "react";
import { tr } from "@/lib/strings";
import { addCaregiver, setCaregiverStatus, type CaregiverState } from "@/app/(patient)/caregivers/actions";
import { CheckboxField, Field, FormMessage, Input, Select } from "@/components/forms";
import { StatusChip } from "@/components/StatusChip";
import { SubmitButton } from "@/components/SubmitButton";

export type CaregiverItem = { id: string; full_name: string; relationship: string | null; phone: string; notify_after_missed: number; status: "pending" | "accepted" | "paused"; lastAlert: string | null };

/**
 * Me → Caregivers: who gets a text when a dose is missed or a red flag fires. Consent is a
 * tick the patient must make; the caregiver must reply YES before anything is sent. Each row
 * shows its state in words (waiting for YES / active / paused) with pause, resume, remove.
 */
export function CaregiverSection({ items, demo }: { items: CaregiverItem[]; demo: boolean }) {
  const t = tr("caregivers");
  const [state, formAction] = useActionState(addCaregiver, undefined as CaregiverState);
  const [open, setOpen] = useState(items.length === 0);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const err = (k: string) => (state?.fieldErrors?.[k] ? t(`errors.${state.fieldErrors[k]}`) : undefined);
  const act = (id: string, action: Parameters<typeof setCaregiverStatus>[1]) => {
    setBusyId(id);
    start(async () => {
      await setCaregiverStatus(id, action).catch(() => ({ ok: false }));
      setBusyId(null);
    });
  };
  const tone = { pending: "neutral", accepted: "success", paused: "warning" } as const;

  return (
    <div className="space-y-4" data-testid="caregivers">
      <p className="text-base text-ink-2">{t("intro")}</p>
      {items.length > 0 && (
        <ul className="divide-y divide-surface-2">
          {items.map((c) => (
            <li key={c.id} className="space-y-2 py-3" data-testid="caregiver-row">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold [overflow-wrap:anywhere]">
                    {c.full_name} {c.relationship && <span className="font-normal text-ink-2">· {c.relationship}</span>}
                  </p>
                  <p className="font-mono text-sm text-ink-2">
                    {c.phone} · {t("after", { count: c.notify_after_missed })}
                  </p>
                  {c.lastAlert && <p className="text-sm text-ink-2">{t("lastAlert", { when: c.lastAlert })}</p>}
                </div>
                <StatusChip tone={tone[c.status]}>{t(`status.${c.status}`)}</StatusChip>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status === "pending" && (
                  <>
                    <button type="button" disabled={pending && busyId === c.id} onClick={() => act(c.id, "resend")} className="btn-outline px-3 text-sm">
                      {t("resend")}
                    </button>
                    {demo && (
                      <button type="button" disabled={pending && busyId === c.id} onClick={() => act(c.id, "simulateYes")} className="btn-outline px-3 text-sm" data-testid="simulate-yes">
                        {t("simulateYes")}
                      </button>
                    )}
                  </>
                )}
                {c.status === "accepted" && (
                  <button type="button" disabled={pending && busyId === c.id} onClick={() => act(c.id, "pause")} className="btn-outline px-3 text-sm">
                    {t("pause")}
                  </button>
                )}
                {c.status === "paused" && (
                  <button type="button" disabled={pending && busyId === c.id} onClick={() => act(c.id, "resume")} className="btn-outline px-3 text-sm">
                    {t("resume")}
                  </button>
                )}
                <button type="button" disabled={pending && busyId === c.id} onClick={() => act(c.id, "remove")} className="btn-outline px-3 text-sm">
                  {t("remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {state?.ok === "invited" && <FormMessage tone="success">{t("invited")}</FormMessage>}
      {state?.ok === "invitedNotSent" && <FormMessage tone="info">{t("invitedNotSent")}</FormMessage>}
      {state?.error && <FormMessage tone="error">{t(`errors.${state.error}`)}</FormMessage>}

      {open ? (
        <form action={formAction} className="space-y-4 rounded-button bg-bg p-3" noValidate>
          <Field label={t("name")} htmlFor="cg-name" error={err("fullName")}>
            <Input id="cg-name" name="fullName" invalid={Boolean(err("fullName"))} autoComplete="name" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("relationship")} htmlFor="cg-rel">
              <Input id="cg-rel" name="relationship" placeholder={t("relationshipHint")} />
            </Field>
            <Field label={t("phone")} htmlFor="cg-phone" hint={t("phoneHint")} error={err("phone")}>
              <Input id="cg-phone" name="phone" type="tel" inputMode="tel" placeholder="0803 000 0000" invalid={Boolean(err("phone"))} className="font-mono" />
            </Field>
          </div>
          <Field label={t("notifyAfter")} htmlFor="cg-after">
            <Select id="cg-after" name="notifyAfter" defaultValue="1">
              <option value="1">{t("after", { count: 1 })}</option>
              <option value="2">{t("after", { count: 2 })}</option>
            </Select>
          </Field>
          <CheckboxField id="cg-consent" name="consent" label={t("consent")} error={err("consent")} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton pendingLabel={t("saving")}>{t("add")}</SubmitButton>
            {items.length > 0 && (
              <button type="button" onClick={() => setOpen(false)} className="btn-outline">
                {t("cancel")}
              </button>
            )}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn-outline" data-testid="add-caregiver">
          {t("addButton")}
        </button>
      )}
    </div>
  );
}
