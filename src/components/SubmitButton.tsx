"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Primary submit that shows its pending state in words (not a spinner alone). */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  name,
  value,
  formNoValidate,
  ariaLabel,
}: {
  children: ReactNode;
  pendingLabel: ReactNode;
  variant?: "primary" | "outline";
  className?: string;
  name?: string;
  value?: string;
  /** Skip HTML validation (secondary intents such as "resend" that do not need the field). */
  formNoValidate?: boolean;
  /** Distinguishes repeated buttons in a list ("Block Ngozi Eze"). */
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formNoValidate={formNoValidate}
      aria-label={ariaLabel}
      disabled={pending}
      aria-busy={pending}
      className={`${variant === "primary" ? "btn-primary" : "btn-outline"} disabled:opacity-70 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
