import { tr } from "@/lib/strings";
import type { PackRead, PackField } from "@/lib/ai/scan";
import { StatusChip, type ChipTone } from "@/components/StatusChip";
import { SectionLabel } from "@/components/ui";

const shown: PackField[] = ["drug_name", "strength", "form", "nafdac_no", "manufacturer", "expiry_date", "batch_no"];

export function confidenceTone(c: number): ChipTone {
  return c >= 0.8 ? "success" : c >= 0.5 ? "warning" : "neutral";
}

/**
 * What the reader saw on the pack, one row per printed field with its own confidence chip.
 * Never shows a dose: the reader is not allowed to read one. Used on the patient's add flow,
 * the Scan tab and the pharmacist's verification queue.
 */
export function PackReadCard({ pack, title, compact = false }: { pack: PackRead; title?: string; compact?: boolean }) {
  const t = tr("packRead");
  return (
    <section className={compact ? "" : "rounded-card border border-border bg-surface p-4"}>
      <SectionLabel>{title ?? t("title")}</SectionLabel>
      <dl className="mt-2 divide-y divide-surface-2">
        {shown.map((key) => {
          const f = pack[key];
          return (
            <div key={key} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
              <dt className="text-base text-ink-2">{t(`fields.${key}`)}</dt>
              <dd className="flex min-w-0 flex-wrap items-center justify-end gap-2 [overflow-wrap:anywhere]">
                <span className={`${key === "drug_name" ? "text-lg font-semibold" : "font-mono text-base"}`}>{f.value ?? t("notSeen")}</span>
                {f.value && (
                  <StatusChip tone={confidenceTone(f.confidence)}>
                    <span className="font-mono">{Math.round(f.confidence * 100)}%</span>
                  </StatusChip>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-2 text-sm text-ink-2">{t("noDoseNote")}</p>
    </section>
  );
}
