import type { ReactNode } from "react";

export type ChipTone = "success" | "warning" | "danger" | "primary" | "neutral";

const tones: Record<ChipTone, { chip: string; dot: string }> = {
  success: { chip: "bg-success-tint text-success", dot: "bg-success" },
  warning: { chip: "bg-warning-tint text-warning", dot: "bg-warning-dot" },
  danger: { chip: "bg-danger-tint text-danger", dot: "bg-danger" },
  primary: { chip: "bg-primary-tint text-primary", dot: "bg-primary" },
  neutral: { chip: "bg-surface-2 text-ink-2", dot: "bg-ink-3" },
};

/** Section 3 v2 status chip: fully rounded, coloured dot + word. Colour is never the only signal. */
export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  const t = tones[tone];
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-sm font-medium ${t.chip}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}
