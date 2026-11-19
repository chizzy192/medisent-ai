import type { ReactNode } from "react";
import type { DoseState } from "./MedicineCard";

/**
 * Signature element 2: today's doses as a vertical timeline. Node colours: success = taken,
 * primary with a soft halo = now, border-grey = later, warning = late. Each item's card says
 * its state in words (status chip), so the node colour is never the only signal.
 */
const nodeClass: Record<DoseState, string> = {
  taken: "bg-success",
  now: "bg-primary ring-4 ring-primary-tint",
  later: "border-2 border-border bg-surface",
  late: "bg-warning-dot",
  missed: "bg-warning-dot",
  snoozed: "border-2 border-warning-dot bg-surface",
};

export function DayTimeline({ items }: { items: { key: string; state: DoseState; card: ReactNode }[] }) {
  return (
    <ol className="relative space-y-3 before:absolute before:top-4 before:bottom-4 before:left-[7px] before:w-px before:bg-border">
      {items.map((item) => (
        <li key={item.key} className="relative pl-7">
          <span aria-hidden="true" className={`absolute top-6 left-0 size-[15px] rounded-full ${nodeClass[item.state]}`} />
          {item.card}
        </li>
      ))}
    </ol>
  );
}
