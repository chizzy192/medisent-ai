"use client";

import { useEffect, useId, useState } from "react";
import { tr } from "@/lib/strings";
import { findDrugs } from "@/app/formulary/actions";
import type { FormularyDrug } from "@/lib/formulary";
import { Input } from "@/components/forms";
import { StatusChip } from "@/components/StatusChip";
import { CheckIcon } from "@/components/icons";

export function drugLabel(d: FormularyDrug) {
  return [d.name, d.strength, d.form].filter(Boolean).join(" · ");
}

/**
 * Pick a medicine from the formulary: a search box over the `drugs` table and a list of 48px
 * rows; the chosen row is shown as a card with "Change". Suggestions (from a pack photo) are
 * listed first. Free text is never accepted: the name, strength and form always come from
 * the formulary row.
 */
export function DrugPicker({
  value,
  onChange,
  suggestions = [],
  initialQuery = "",
  label,
}: {
  value: FormularyDrug | null;
  onChange: (d: FormularyDrug | null) => void;
  suggestions?: FormularyDrug[];
  initialQuery?: string;
  label?: string;
}) {
  const t = tr("formulary");
  const id = useId();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<FormularyDrug[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (value) return;
    let active = true;
    const timer = setTimeout(() => {
      setBusy(true);
      findDrugs(query)
        .then((rows) => {
          if (!active) return;
          setResults(rows);
          setBusy(false);
        })
        .catch(() => {
          if (!active) return;
          setResults([]);
          setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, value]);

  if (value) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-button border-2 border-primary bg-primary-tint p-3" data-testid="drug-picked">
        <div className="min-w-0 flex-[1_1_10rem]">
          <p className="text-lg font-semibold [overflow-wrap:anywhere]">
            {value.name} <span className="font-mono text-base font-medium text-ink-2">{value.strength}</span>
          </p>
          <p className="text-sm text-ink-2">
            {value.form}
            {value.manufacturer ? ` · ${value.manufacturer}` : ""}
            {value.nafdac_no ? ` · ${value.nafdac_no}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="btn-outline px-4 text-sm">
          {t("change")}
        </button>
      </div>
    );
  }

  const suggestedIds = new Set(suggestions.map((s) => s.id));
  const rows = [...suggestions, ...results.filter((r) => !suggestedIds.has(r.id))];

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-q`} className="block text-base font-medium text-ink">
        {label ?? t("search")}
      </label>
      <Input id={`${id}-q`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("placeholder")} autoComplete="off" data-testid="drug-search" />
      <ul aria-label={t("results")} aria-busy={busy} className="divide-y divide-surface-2 rounded-button border border-border bg-surface">
        {rows.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => onChange(d)} className="flex min-h-12 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-bg" data-testid="drug-option">
              <span className="min-w-0 flex-[1_1_10rem]">
                <span className="block font-semibold [overflow-wrap:anywhere]">
                  {d.name} <span className="font-mono text-sm font-medium text-ink-2">{d.strength}</span>
                </span>
                <span className="block text-sm text-ink-2">
                  {d.form}
                  {d.generic_name && d.generic_name.toLowerCase() !== d.name.toLowerCase() ? ` · ${d.generic_name}` : ""}
                </span>
              </span>
              {suggestedIds.has(d.id) ? (
                <StatusChip tone="primary">
                  <CheckIcon size={14} /> {t("fromPhoto")}
                </StatusChip>
              ) : null}
            </button>
          </li>
        ))}
        {rows.length === 0 && !busy && <li className="px-3 py-3 text-base text-ink-2">{t("none")}</li>}
      </ul>
      <p className="text-sm text-ink-2">{t("notListed")}</p>
    </div>
  );
}
