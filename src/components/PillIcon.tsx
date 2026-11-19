/**
 * Signature element 3 (BUILD_PLAN section 3): the medicine drawn in its real shape and colour,
 * so elderly and low-literacy patients can match the screen to the pack.
 * Values mirror prescriptions.pill_shape / prescriptions.pill_color (Stage 1 schema).
 * Decorative: the medicine name next to it always carries the meaning.
 */
export type PillShape = "round" | "capsule" | "oval" | "inhaler" | "liquid" | "injection";

const outline = "var(--color-ink-3)";

function Glyph({ shape, color }: { shape: PillShape; color: string }) {
  switch (shape) {
    case "round":
      return (
        <>
          <circle cx="12" cy="12" r="7.5" fill={color} stroke={outline} strokeWidth="1" />
          <path d="M7.5 12h9" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" />
        </>
      );
    case "oval":
      return (
        <>
          <ellipse cx="12" cy="12" rx="8.5" ry="5.5" fill={color} stroke={outline} strokeWidth="1" />
          <path d="M8 12h8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case "capsule":
      return (
        <>
          <rect x="3.5" y="8" width="17" height="8" rx="4" fill="#ffffff" stroke={outline} strokeWidth="1" />
          <path d="M12 8h4.5a4 4 0 0 1 0 8H12Z" fill={color} />
          <rect x="3.5" y="8" width="17" height="8" rx="4" fill="none" stroke={outline} strokeWidth="1" />
        </>
      );
    case "inhaler":
      return (
        <>
          <rect x="7" y="3.5" width="7" height="12" rx="2" fill={color} stroke={outline} strokeWidth="1" />
          <path d="M9 15.5h8a1.5 1.5 0 0 1 1.5 1.5v2.5a1 1 0 0 1-1 1H9Z" fill={color} stroke={outline} strokeWidth="1" />
        </>
      );
    case "liquid":
      return (
        <>
          <path d="M9.5 3.5h5v3l2 2.5v10a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5V9l2-2.5Z" fill="#ffffff" stroke={outline} strokeWidth="1" />
          <path d="M7.5 12.5h9v6.5a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5Z" fill={color} />
        </>
      );
    case "injection":
      return (
        <>
          <rect x="5" y="9.5" width="11" height="5" rx="1" fill={color} stroke={outline} strokeWidth="1" />
          <path d="M16 12h4.5M3 9.5v5M5 12H3" stroke={outline} strokeWidth="1.25" strokeLinecap="round" />
        </>
      );
  }
}

export function PillIcon({ shape, color, size = 40 }: { shape: PillShape; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-button bg-surface-2"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" focusable="false">
        <Glyph shape={shape} color={color} />
      </svg>
    </span>
  );
}
