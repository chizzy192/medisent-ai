import type { ReactNode } from "react";
import { CardRow } from "./CardRow";
import { PillIcon, type PillShape } from "./PillIcon";
import { StatusChip, type ChipTone } from "./StatusChip";

export type DoseState = "taken" | "now" | "later" | "late" | "missed" | "snoozed";

/**
 * MedicineCard (section 3 v2 + signature element 3): pill icon in the medicine's real colour
 * and shape; name + mono strength on one line; mono time · dose below; status chip right.
 * Reflow (owner rule): the name column has min-width 0 and overflow-wrap: break-word, no
 * hyphenation; the chip wraps under the name with the time line when space runs out, and the
 * pill icon moves above the text at very large text sizes. Never clips at 200% text.
 * The "now" card has a 2px primary border; "late" a warning border.
 */
export function MedicineCard({
  name,
  strength,
  time,
  dose,
  pill,
  status,
  state = "later",
  actions,
  footer,
}: {
  name: string;
  strength: string;
  time: string;
  dose: string;
  pill: { shape: PillShape; color: string };
  status: { tone: ChipTone; label: string };
  state?: DoseState;
  /** e.g. "I took it" (primary) + "Later" (outline). */
  actions?: ReactNode;
  /** e.g. a Listen control or a supply meter. */
  footer?: ReactNode;
}) {
  const border =
    state === "now" ? "border-2 border-primary" : state === "late" || state === "missed" ? "border-2 border-warning-dot" : "border border-border";
  return (
    <article className={`rounded-card bg-surface p-4 ${border}`}>
      <div className="flex flex-wrap items-start gap-3">
        <PillIcon shape={pill.shape} color={pill.color} />
        <div className="min-w-0 flex-[1_1_8rem]">
          <CardRow
            main={
              <>
                <h3 className="text-card-title font-semibold [text-wrap:pretty]">
                  {name} <span className="font-mono text-base leading-none font-medium whitespace-nowrap text-ink-2">{strength}</span>
                </h3>
                {/* Time is the number an elderly patient must read: 22px mono, ink. Dose beside it. */}
                <p className="font-mono text-time font-medium text-ink">
                  {time} <span className="text-base whitespace-nowrap text-ink-2">· {dose}</span>
                </p>
              </>
            }
            value={<StatusChip tone={status.tone}>{status.label}</StatusChip>}
          />
        </div>
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-3 [&>*]:flex-[1_1_6rem]">{actions}</div>}
      {footer && <div className="mt-4 border-t border-surface-2 pt-3">{footer}</div>}
    </article>
  );
}
