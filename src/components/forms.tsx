import type { ComponentProps, ReactNode } from "react";
import { AlertIcon, CheckIcon } from "./icons";

/**
 * Form primitives (section 3 v2): 18px labels, 48px inputs with a 1px border and 10px
 * radius, errors as icon + sentence under the field (never colour alone). Every control is a
 * native element so it works without JS and with screen readers.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-base font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-0.5 text-sm text-ink-2">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1.5 flex items-start gap-1.5 text-base font-medium text-danger">
          <AlertIcon size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const controlClass =
  "block w-full min-h-12 rounded-button border border-border bg-surface px-3 text-base text-ink placeholder:text-ink-3 aria-invalid:border-danger aria-invalid:border-2";

/** Links the control to its Field hint and error for screen readers. */
export function describedBy(id: string, opts: { hint?: boolean; error?: boolean }) {
  const ids = [opts.hint && `${id}-hint`, opts.error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function Input({ className = "", invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input className={`${controlClass} ${className}`} aria-invalid={invalid || undefined} {...props} />;
}

export function Select({ className = "", invalid, children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select className={`${controlClass} ${className}`} aria-invalid={invalid || undefined} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea className={`${controlClass} py-2.5 ${className}`} aria-invalid={invalid || undefined} {...props} />;
}

/** Checkbox with a large label (consent, confirmations): the whole row is the target. */
export function CheckboxField({ id, label, error, ...props }: ComponentProps<"input"> & { id: string; label: ReactNode; error?: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-button border border-border bg-surface p-3">
        <input id={id} type="checkbox" className="mt-1 size-5 shrink-0 accent-primary" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
        <span className="text-base text-ink">{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-base font-medium text-danger">
          <AlertIcon size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Form-level message: error (danger tint), success (success tint) or info (primary tint). */
export function FormMessage({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const cls = {
    error: "bg-danger-tint text-danger",
    success: "bg-success-tint text-success",
    info: "bg-primary-tint text-primary",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-button p-3 text-base ${cls}`}>
      {tone === "success" ? <CheckIcon size={20} className="mt-0.5 shrink-0" /> : <AlertIcon size={20} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

/** Standard page frame for forms: narrow column, page title, intro. */
export function FormPage({ title, intro, children }: { title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl">{title}</h1>
      {intro && <p className="mt-2 text-base text-ink-2">{intro}</p>}
      <div className="mt-6">{children}</div>
    </main>
  );
}
