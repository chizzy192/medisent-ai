"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { markRefilled } from "@/app/(patient)/home/actions";
import { PillIcon, type PillShape } from "./PillIcon";
import { StatusChip } from "./StatusChip";

export type RefillItem = { prescriptionId: string; name: string; strength: string | null; daysLeft: number; quantity: number | null; pill: { shape: PillShape; color: string } };

/**
 * Refill banner (BUILD_PLAN Stage 2): a calm warning-tint card listing medicines with three
 * days or less of supply. "I got a refill" asks how many came in the new pack (prefilled with
 * the last pack size) so the count is right, then resets the days. Never red.
 */
export function RefillBanner({ items }: { items: RefillItem[] }) {
  const t = useTranslations("refill");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string[]>([]);
  const rows = items.filter((i) => !done.includes(i.prescriptionId));
  if (!rows.length) return null;

  const save = (item: RefillItem) => {
    const n = Number(qty[item.prescriptionId] ?? item.quantity ?? 0);
    if (!n || n < 1) return setError((e) => ({ ...e, [item.prescriptionId]: t("quantityRequired") }));
    setBusy(item.prescriptionId);
    setError((e) => ({ ...e, [item.prescriptionId]: "" }));
    start(async () => {
      try {
        const res = await markRefilled(item.prescriptionId, n);
        if (res.ok) setDone((d) => [...d, item.prescriptionId]);
        else setError((e) => ({ ...e, [item.prescriptionId]: t("notSaved") }));
      } catch {
        setError((e) => ({ ...e, [item.prescriptionId]: navigator.onLine ? t("notSaved") : t("notSavedOffline") }));
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <section aria-labelledby="refill-title" className="rounded-card border border-warning-dot bg-warning-tint p-4">
      <h2 id="refill-title" className="label-mono text-warning">
        {t("label")}
      </h2>
      <p className="mt-1 text-base text-ink">{t("body")}</p>
      <ul className="mt-3 space-y-3">
        {rows.map((item) => {
          const id = item.prescriptionId;
          const left = item.daysLeft;
          return (
            <li key={id} className="rounded-button bg-surface p-3">
              <div className="flex flex-wrap items-center gap-3">
                <PillIcon shape={item.pill.shape} color={item.pill.color} size={36} />
                <div className="min-w-0 flex-[1_1_8rem] [overflow-wrap:break-word] [hyphens:manual]">
                  <p className="text-lg font-semibold">
                    {item.name} {item.strength && <span className="font-mono text-base font-medium whitespace-nowrap text-ink-2">{item.strength}</span>}
                  </p>
                  <p className="font-mono text-lg text-warning">{left < 0 ? t("ranOut") : left === 0 ? t("outToday") : t("daysLeft", { count: left })}</p>
                </div>
                {open !== id && (
                  <button type="button" onClick={() => setOpen(id)} className="btn-outline w-full sm:w-auto">
                    {t("gotRefill")}
                  </button>
                )}
              </div>
              {open === id && (
                <div className="mt-3 space-y-2 border-t border-surface-2 pt-3">
                  <label htmlFor={`qty-${id}`} className="block text-base font-medium">
                    {t("howMany")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id={`qty-${id}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={1000}
                      value={qty[id] ?? (item.quantity ? String(item.quantity) : "")}
                      onChange={(e) => setQty((q) => ({ ...q, [id]: e.target.value }))}
                      className="min-h-12 w-32 rounded-button border border-border bg-surface px-3 font-mono text-lg"
                    />
                    <button type="button" aria-disabled={pending && busy === id} onClick={() => save(item)} className="btn-primary">
                      {busy === id ? t("saving") : t("save")}
                    </button>
                    <button type="button" onClick={() => setOpen(null)} className="btn-outline">
                      {t("notYet")}
                    </button>
                  </div>
                  {error[id] && (
                    <p role="alert" className="text-base font-medium text-danger">
                      {error[id]}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <StatusChip tone="warning">
        <span className="sr-only">{t("label")}: </span>
        {t("count", { count: rows.length })}
      </StatusChip>
    </section>
  );
}
