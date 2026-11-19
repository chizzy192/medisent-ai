import type { ReactNode } from "react";

/**
 * Card header with a right-side value (medicine card time + chip, clinic distance + Go,
 * caregiver status, drug-check result, dashboard rows). Reflow rule (BUILD_PLAN owner spec):
 * - the main column has min-width 0 and overflow-wrap: break-word, never break-all,
 *   and no hyphenation (drug names must not be split with invented hyphens);
 * - the value group (e.g. time + status chip) stays together and wraps below the main
 *   column when there is not room beside it (small screens, 150% / 200% text).
 */
export function CardRow({ main, value }: { main: ReactNode; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 flex-[1_1_9rem] [overflow-wrap:break-word] [hyphens:manual]">{main}</div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">{value}</div>
    </div>
  );
}
