import type { ReactNode } from "react";

/**
 * Red-flag AlertBanner (section 3 v2): the only solid red in the app. Full width, mono label
 * (e.g. "Alert · 18:12"), title, plain sentence, and a white call action. Use `live` when the
 * banner appears in response to something the patient just said, so screen readers announce it.
 */
export function AlertBanner({
  label,
  title,
  children,
  action,
  live = false,
  className = "",
}: {
  label: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  /** Usually a white call link: <a href="tel:…" className="alert-action">…</a> */
  action?: ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <section role={live ? "alert" : undefined} className={`bg-danger-solid p-4 text-on-danger sm:p-5 ${className}`}>
      <p className="font-mono text-label tracking-[0.04em] uppercase">{label}</p>
      <h2 className="mt-1 text-2xl text-on-danger">{title}</h2>
      {children && <div className="mt-1 text-base">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}

/** White full-width call block on the red banner (red 600 text). */
export const alertActionClass =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-white px-4 text-center text-base font-semibold text-[#C81E1E]";
