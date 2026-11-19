import type { ReactNode } from "react";
import { SectionLabel } from "./ui";

/** Empty / first-run state: mono label, title, one plain sentence, one action. */
export function EmptyState({
  label,
  title,
  icon,
  children,
  action,
}: {
  label: ReactNode;
  title: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-surface p-6">
      {icon && (
        <span aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-button bg-primary-tint text-primary">
          {icon}
        </span>
      )}
      <SectionLabel>{label}</SectionLabel>
      <h1 className="mt-1 text-2xl">{title}</h1>
      {children && <div className="mt-2 max-w-[52ch] text-base text-ink-2">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap gap-3">{action}</div>}
    </section>
  );
}
