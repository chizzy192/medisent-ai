/**
 * Reminder and dose maths shared by the server and the browser (BUILD_PLAN Stage 2).
 * All clock times are Africa/Lagos (UTC+1, no DST), whatever zone the server runs in.
 */
export const LAGOS_OFFSET_MS = 60 * 60 * 1000;
export const LATE_AFTER_MS = 2 * 60 * 60 * 1000;
export const DUE_WINDOW_BEFORE_MS = 30 * 60 * 1000;
export const SNOOZE_MS = 30 * 60 * 1000;

/** Default times by frequency: 1 → 08:00; 2 → 08:00, 20:00; 3 → 08:00, 14:00, 20:00; 4 → every 6 h. */
export function defaultTimes(frequencyPerDay: number): string[] {
  const n = Math.min(6, Math.max(1, frequencyPerDay));
  const presets: Record<number, string[]> = {
    1: ["08:00"],
    2: ["08:00", "20:00"],
    3: ["08:00", "14:00", "20:00"],
    4: ["06:00", "12:00", "18:00", "22:00"],
  };
  if (presets[n]) return presets[n];
  const step = Math.floor(16 / (n - 1));
  return Array.from({ length: n }, (_, i) => `${String(6 + i * step).padStart(2, "0")}:00`);
}

/** Lagos calendar date (YYYY-MM-DD) for an instant. */
export function lagosDate(at: Date = new Date()): string {
  return new Date(at.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** Instant for a Lagos date + "HH:MM". */
export function lagosInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+01:00`);
}

/** Start of the Lagos day as an instant. */
export function lagosDayStart(at: Date = new Date()): Date {
  return lagosInstant(lagosDate(at), "00:00");
}

export type DoseState = "taken" | "late" | "missed" | "now" | "later" | "snoozed";

/** Decide the card state for a scheduled dose from its log (if any) and the clock. */
export function doseState(scheduledAt: Date, log: { status: string; snoozed_until?: string | null } | null, now = new Date()): DoseState {
  if (log?.status === "taken" || log?.status === "late") return "taken";
  if (log?.status === "missed") return "missed";
  if (log?.status === "snoozed" && log.snoozed_until && new Date(log.snoozed_until) > now) return "snoozed";
  const delta = now.getTime() - scheduledAt.getTime();
  if (delta > LATE_AFTER_MS) return "late";
  if (delta > -DUE_WINDOW_BEFORE_MS) return "now";
  return "later";
}

/** Days of supply left from a refill row (negative when already out). */
export function daysLeft(refill: { runs_out_on: string }, today = lagosDate()): number {
  const out = new Date(`${refill.runs_out_on}T00:00:00+01:00`).getTime();
  const now = new Date(`${today}T00:00:00+01:00`).getTime();
  return Math.round((out - now) / 86_400_000);
}

export function timeLabel(at: Date): string {
  return new Date(at.getTime() + LAGOS_OFFSET_MS).toISOString().slice(11, 16);
}

export const NAFDAC_PATTERN = /^[A-Z]\d{1,2}-\d{4,5}$|^DEMO-[A-Z0-9]{2}-\d{4}$/;
