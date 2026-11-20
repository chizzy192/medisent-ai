"use client";

import { tr } from "@/lib/strings";
import type { InteractionHit } from "@/lib/interactions";
import { AlertIcon } from "@/components/icons";
import { ListenButton } from "@/components/ListenButton";

/**
 * Interaction warning cards: red (danger) for major, amber (warning) for moderate. Icon + word,
 * never colour alone; each card can be read aloud. The text is the table's own sentence.
 */
export function InteractionCards({ hits, rate = 1, compact = false }: { hits: InteractionHit[]; rate?: number; compact?: boolean }) {
  const t = tr("interactions");
  if (!hits.length) return null;
  return (
    <ul className="space-y-3" data-testid="interaction-cards">
      {hits.map((h, i) => {
        const major = h.severity === "major";
        const spoken = `${major ? t("majorLead") : t("moderateLead")} ${h.message} ${h.advice}`;
        return (
          <li key={i} className={`rounded-card border-2 p-4 ${major ? "border-danger bg-danger-tint" : "border-warning-dot bg-warning-tint"}`} data-severity={h.severity}>
            <p className={`flex items-center gap-2 font-semibold ${major ? "text-danger" : "text-warning"}`}>
              <AlertIcon size={20} className="shrink-0" />
              {major ? t("majorTitle", { name: h.withName }) : t("moderateTitle", { name: h.withName })}
            </p>
            <p className="mt-2 text-base text-ink">{major ? t("majorLead") : t("moderateLead")}</p>
            <p className="mt-1 text-base text-ink">{h.message}</p>
            <p className="mt-1 text-base text-ink-2">{h.advice}</p>
            {!compact && (
              <div className="mt-2">
                <ListenButton text={spoken} rate={rate} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
