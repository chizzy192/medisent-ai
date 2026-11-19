/** Accessibility settings shared by the Me screen, its action and the root layout. */
export const TEXT_SIZES = ["normal", "large", "larger"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const TEXT_SIZE_COOKIE = "medisent_text";
export const CONTRAST_COOKIE = "medisent_contrast";
export const SPEECH_RATES = [0.8, 1, 1.2] as const;

export function isTextSize(v: unknown): v is TextSize {
  return typeof v === "string" && (TEXT_SIZES as readonly string[]).includes(v);
}
