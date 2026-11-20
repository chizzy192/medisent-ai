import type { WithFood } from "@/lib/db/types";
import { defaultTimes } from "@/lib/reminders";

/**
 * Pure helpers for the dosing a PERSON types (pharmacist dispensing, patient self-add, the
 * verification queue's Edit). No database imports, so the browser bundle and every server
 * action share exactly the same cleaning. The AI never feeds these.
 */
export type DosingInput = { dose: string; frequency_per_day: number; duration_days: number | null; with_food: WithFood; times: string[]; quantity: number | null };

export function cleanDosing(raw: { dose: unknown; frequency: unknown; duration: unknown; withFood: unknown; times: unknown; quantity: unknown }): { value: DosingInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const dose = typeof raw.dose === "string" ? raw.dose.trim().slice(0, 40) : "";
  if (!dose) errors.dose = "doseRequired";
  const times = [...new Set((Array.isArray(raw.times) ? raw.times : []).filter((t): t is string => typeof t === "string" && /^\d{2}:\d{2}$/.test(t)))].sort().slice(0, 6);
  const frequency = times.length || Math.min(6, Math.max(0, Number(raw.frequency) || 0));
  if (!frequency) errors.frequency = "frequencyRequired";
  const duration = Number(raw.duration);
  const withFood = (["before", "after", "with", "any"] as WithFood[]).includes(raw.withFood as WithFood) ? (raw.withFood as WithFood) : "any";
  const quantity = Number(raw.quantity);
  return {
    value: {
      dose,
      frequency_per_day: frequency || 1,
      duration_days: duration >= 1 && duration <= 365 ? Math.round(duration) : null,
      with_food: withFood,
      times: times.length ? times : defaultTimes(frequency || 1),
      quantity: quantity > 0 ? Math.min(1000, Math.round(quantity)) : null,
    },
    errors,
  };
}

/** "1 tablet" → 1, "2 puffs" → 2, "5 ml" → 5; anything else counts as one unit. */
export function unitsFromDose(dose: string): number {
  return Number(dose.match(/^(\d+(?:\.\d+)?)/)?.[1] ?? 1) || 1;
}
