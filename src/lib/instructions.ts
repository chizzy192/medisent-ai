import type { Locale } from "@/config/locales";
import type { WithFood } from "@/lib/ai/scan";

/**
 * Plain-language instruction builder (BUILD_PLAN Stage 2): one short sentence a 10-year-old
 * understands, in the patient's language. "Take 1 tablet 3 times a day after food, for 5 days."
 * Hand-drafted templates; native speakers must check ig / yo / ha / pcm.
 */
export type InstructionInput = {
  dose: string;
  form: string;
  frequency_per_day: number;
  duration_days: number | null;
  with_food: WithFood;
  times?: string[];
};

const en = {
  freq: (n: number) => (n === 1 ? "once a day" : n === 2 ? "twice a day" : `${n} times a day`),
  food: { before: "before food", after: "after food", with: "with food", any: "" },
  days: (d: number) => (d === 1 ? "for 1 day" : `for ${d} days`),
  build: (dose: string, freq: string, food: string, days: string, times: string) =>
    `Take ${dose} ${freq}${food ? `, ${food}` : ""}${days ? `, ${days}` : ""}${times ? `, at ${times}` : ""}.`,
};

const templates: Record<Locale, typeof en> = {
  en,
  pcm: {
    freq: (n) => (n === 1 ? "one time every day" : n === 2 ? "two times every day" : `${n} times every day`),
    food: { before: "before you chop", after: "after you chop", with: "with food", any: "" },
    days: (d) => (d === 1 ? "for 1 day" : `for ${d} days`),
    build: (dose, freq, food, days, times) => `Take ${dose} ${freq}${food ? `, ${food}` : ""}${days ? `, ${days}` : ""}${times ? `, for ${times}` : ""}.`,
  },
  ig: {
    freq: (n) => (n === 1 ? "otu ugboro n'ụbọchị" : n === 2 ? "ugboro abụọ n'ụbọchị" : `ugboro ${n} n'ụbọchị`),
    food: { before: "tupu i rie nri", after: "mgbe i richara nri", with: "na nri", any: "" },
    days: (d) => (d === 1 ? "ruo otu ụbọchị" : `ruo ụbọchị ${d}`),
    build: (dose, freq, food, days, times) => `Ṅụọ ${dose} ${freq}${food ? `, ${food}` : ""}${days ? `, ${days}` : ""}${times ? `, n'elekere ${times}` : ""}.`,
  },
  yo: {
    freq: (n) => (n === 1 ? "lẹ́ẹ̀kan lójúmọ́" : n === 2 ? "lẹ́ẹ̀mejì lójúmọ́" : `ní ìgbà ${n} lójúmọ́`),
    food: { before: "kí o tó jẹun", after: "lẹ́yìn oúnjẹ", with: "pẹ̀lú oúnjẹ", any: "" },
    days: (d) => (d === 1 ? "fún ọjọ́ kan" : `fún ọjọ́ ${d}`),
    build: (dose, freq, food, days, times) => `Lo ${dose} ${freq}${food ? `, ${food}` : ""}${days ? `, ${days}` : ""}${times ? `, ní ${times}` : ""}.`,
  },
  ha: {
    freq: (n) => (n === 1 ? "sau ɗaya a rana" : n === 2 ? "sau biyu a rana" : `sau ${n} a rana`),
    food: { before: "kafin cin abinci", after: "bayan cin abinci", with: "tare da abinci", any: "" },
    days: (d) => (d === 1 ? "na kwana ɗaya" : `na kwanaki ${d}`),
    build: (dose, freq, food, days, times) => `Sha ${dose} ${freq}${food ? `, ${food}` : ""}${days ? `, ${days}` : ""}${times ? `, da ƙarfe ${times}` : ""}.`,
  },
};

export function buildInstruction(p: InstructionInput, locale: Locale): string {
  const t = templates[locale] ?? en;
  const dose = p.dose.trim() || (locale === "en" ? "1 dose" : "1");
  const times = p.times && p.times.length <= 3 ? p.times.join(", ") : "";
  return t.build(dose, t.freq(p.frequency_per_day), t.food[p.with_food] ?? "", p.duration_days ? t.days(p.duration_days) : "", times);
}
