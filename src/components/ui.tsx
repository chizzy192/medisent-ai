import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Shared primitives (BUILD_PLAN section 3 v2). One primary button per card; secondary actions
 * are outlined cobalt. Buttons are 48px minimum, 10px radius, and wrap for long labels and large text.
 */
type Variant = "primary" | "outline";
const buttonClass = (variant: Variant, extra = "") =>
  `${variant === "primary" ? "btn-primary" : "btn-outline"} ${extra}`.trim();

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/** White card: 12px radius, 1px border, 16px padding, no shadow. */
export function Card({
  as: Tag = "div",
  className = "",
  id,
  testId,
  children,
}: {
  as?: "div" | "article" | "section" | "li";
  className?: string;
  id?: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <Tag id={id} data-testid={testId} className={`rounded-card border border-border bg-surface p-4 ${className}`}>
      {children}
    </Tag>
  );
}

/** Small mono uppercase section label (12px, 0.04em tracking, ink-3). */
export function SectionLabel({
  as: Tag = "p",
  className = "",
  children,
}: {
  as?: "p" | "span" | "h2" | "h3" | "div";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`label-mono ${className}`}>{children}</Tag>;
}

const meterTone = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning-dot",
} as const;

/**
 * Horizontal meter (supply left, adherence). Colour is not the only signal: the label and the
 * mono value always say it in words.
 */
export function Meter({
  label,
  valueText,
  value,
  max = 100,
  tone = "primary",
}: {
  label: ReactNode;
  valueText: ReactNode;
  value: number;
  max?: number;
  tone?: keyof typeof meterTone;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="min-w-0 [overflow-wrap:break-word]">{label}</span>
        <span className="font-mono text-sm text-ink-2">{valueText}</span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={typeof label === "string" ? label : undefined}
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div className={`h-full rounded-full ${meterTone[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
