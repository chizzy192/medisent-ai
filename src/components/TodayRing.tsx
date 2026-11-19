/**
 * Signature element 1: today's doses as a progress ring with a mono count (`2/3` + `TODAY`).
 * Fills from 0 on first load (600 ms ease-out); instant under prefers-reduced-motion.
 */
export function TodayRing({
  taken,
  total,
  caption,
  label,
  size = 88,
}: {
  taken: number;
  total: number;
  /** Small mono word under the count, e.g. "Today" / "Taken". */
  caption: string;
  /** Full sentence for assistive tech, e.g. "2 of 3 doses taken today". */
  label: string;
  size?: number;
}) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.min(1, taken / total) : 0;
  const offset = c * (1 - fraction);

  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ ["--ring-circumference" as string]: `${c}`, animation: "ring-fill 600ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
        />
      </svg>
      <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl leading-none font-medium">
          {taken}/{total}
        </span>
        <span className="label-mono mt-1">{caption}</span>
      </div>
    </div>
  );
}
