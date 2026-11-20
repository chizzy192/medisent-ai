import type { WithFood } from "@/lib/db/types";

/**
 * Plain-English instruction builder (BUILD_PLAN Stage 2): one short sentence a 10-year-old
 * understands. "Take 1 tablet 3 times a day, after food, for 5 days."
 */
export type InstructionInput = {
  dose: string;
  form: string;
  frequency_per_day: number;
  duration_days: number | null;
  with_food: WithFood;
  times?: string[];
};

const freq = (n: number) => (n === 1 ? "once a day" : n === 2 ? "twice a day" : `${n} times a day`);
const food: Record<WithFood, string> = { before: "before food", after: "after food", with: "with food", any: "" };
const days = (d: number) => (d === 1 ? "for 1 day" : `for ${d} days`);

export function buildInstruction(p: InstructionInput): string {
  const dose = p.dose.trim() || "1 dose";
  const times = p.times && p.times.length <= 3 ? p.times.join(", ") : "";
  const parts = [freq(p.frequency_per_day), food[p.with_food] ?? "", p.duration_days ? days(p.duration_days) : "", times ? `at ${times}` : ""].filter(Boolean);
  return `Take ${dose} ${parts.join(", ")}.`;
}
