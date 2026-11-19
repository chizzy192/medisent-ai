import { brand } from "@/config/brand";

/**
 * Section 3 v2 logo: cobalt rounded square with a white plus, "Medisent" in Plex Sans 600,
 * then a small mono "AI" badge on primary-tint. Never a red cross.
 */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false" className="shrink-0">
        <rect width="28" height="28" rx="7" fill="var(--color-primary)" />
        <path d="M14 8v12M8 14h12" stroke="var(--color-on-primary)" strokeWidth="2.75" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-semibold text-ink">{brand.logo.word}</span>
      <span className="rounded-md bg-primary-tint px-1.5 py-0.5 font-mono text-label text-primary">
        {brand.logo.badge}
      </span>
    </span>
  );
}
