import type { PillShape } from "@/components/PillIcon";

/**
 * Label / prescription reader (BUILD_PLAN section 5): a photo in, the scanner JSON out.
 * Gemini with a response schema; the model name comes from GEMINI_MODEL with a fallback list,
 * because flash aliases change. Red-flag rules do not apply here (no free text from the patient).
 */
export type WithFood = "before" | "after" | "with" | "any";

export type ScanResult = {
  drug_name: string;
  strength: string;
  form: string;
  dose: string;
  frequency_per_day: number;
  duration_days: number | null;
  with_food: WithFood;
  instructions_raw: string;
  warnings_on_label: string[];
  nafdac_no: string | null;
  manufacturer: string | null;
  pill_shape: PillShape | null;
  pill_color: string | null;
  confidence: number;
  missing_fields: string[];
};

/** Below this the app asks for another photo (section 5). */
export const CONFIDENCE_FLOOR = 0.75;

const schema = {
  type: "object",
  properties: {
    drug_name: { type: "string", description: "Medicine name as printed, without strength" },
    strength: { type: "string", description: 'e.g. "500 mg" or "80/480 mg"; empty string if not visible' },
    form: { type: "string", description: "tablet, capsule, syrup, inhaler, injection, cream…" },
    dose: { type: "string", description: 'e.g. "1 tablet", "2 puffs", "5 ml"' },
    frequency_per_day: { type: "integer", description: "1-6; o.d.=1, b.d.=2, t.d.s.=3, q.d.s.=4" },
    duration_days: { type: "integer", nullable: true, description: "x 5/7 = 5 days; null if not stated" },
    with_food: { type: "string", enum: ["before", "after", "with", "any"], description: "a.c. = before, p.c. = after" },
    instructions_raw: { type: "string", description: "The dosing line exactly as printed" },
    warnings_on_label: { type: "array", items: { type: "string" } },
    nafdac_no: { type: "string", nullable: true, description: "NAFDAC registration number as printed, e.g. A4-1234. Never invent one." },
    manufacturer: { type: "string", nullable: true },
    pill_shape: { type: "string", enum: ["round", "capsule", "oval", "inhaler", "liquid", "injection"], nullable: true },
    pill_color: { type: "string", nullable: true, description: "CSS hex colour of the tablet/capsule if a picture shows it" },
    confidence: { type: "number", description: "0-1 for the whole reading" },
    missing_fields: { type: "array", items: { type: "string" }, description: "Field names you could not read" },
  },
  required: ["drug_name", "strength", "form", "dose", "frequency_per_day", "with_food", "instructions_raw", "warnings_on_label", "confidence", "missing_fields"],
};

const prompt = `You read medicine packs and handwritten or printed prescriptions for a Nigerian medication app.
Extract the fields for ONE medicine (the main one if several). Expand pharmacy shorthand:
o.d./od = once daily (1), b.d./bd = twice (2), t.d.s./tds/tid = three times (3), q.d.s./qds/qid = four times (4),
nocte = at night (1), p.c. = after food, a.c. = before food, stat = once now, "x 5/7" = for 5 days, "x 2/52" = 14 days.
Use null for anything you cannot see and name it in missing_fields. Never invent a NAFDAC number or a manufacturer.
confidence is your honesty about the whole reading: below 0.75 when the text is blurry, cut off or ambiguous.`;

const models = [process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-flash-latest"].filter(Boolean) as string[];

export async function readLabel(image: Uint8Array, mime: string): Promise<ScanResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: Buffer.from(image).toString("base64") } }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.1 },
  });
  let lastError = "";
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(45_000),
    });
    if (res.status === 404 || res.status === 503 || res.status === 429) {
      lastError = `${model}: ${res.status}`;
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${model}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(`Gemini ${model}: empty answer`);
    return normalise(JSON.parse(text));
  }
  throw new Error(`No Gemini model answered (${lastError})`);
}

function normalise(raw: Partial<ScanResult>): ScanResult {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const nafdac = str(raw.nafdac_no).toUpperCase().replace(/^NAFDAC\s*(REG\.?\s*)?(NO\.?:?)?\s*/i, "").replace(/\s+/g, "") || null;
  return {
    drug_name: titleCase(str(raw.drug_name)),
    strength: str(raw.strength).replace(/(\d)(mg|mcg|g|ml)\b/gi, "$1 $2"),
    form: str(raw.form).toLowerCase().replace(/s$/, ""),
    dose: str(raw.dose),
    frequency_per_day: Math.min(6, Math.max(1, Number(raw.frequency_per_day) || 1)),
    duration_days: raw.duration_days && Number(raw.duration_days) >= 1 && Number(raw.duration_days) <= 365 ? Math.round(Number(raw.duration_days)) : null,
    with_food: (["before", "after", "with", "any"] as WithFood[]).includes(raw.with_food as WithFood) ? (raw.with_food as WithFood) : "any",
    instructions_raw: str(raw.instructions_raw),
    warnings_on_label: Array.isArray(raw.warnings_on_label) ? raw.warnings_on_label.map(String) : [],
    nafdac_no: nafdac,
    manufacturer: str(raw.manufacturer) || null,
    pill_shape: (["round", "capsule", "oval", "inhaler", "liquid", "injection"] as PillShape[]).includes(raw.pill_shape as PillShape) ? (raw.pill_shape as PillShape) : null,
    pill_color: /^#[0-9a-f]{6}$/i.test(str(raw.pill_color)) ? str(raw.pill_color).toUpperCase() : null,
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
    missing_fields: Array.isArray(raw.missing_fields) ? raw.missing_fields.map((f) => keyFor(String(f))).filter(Boolean) : [],
  };
}

/** The model names missing fields in free text ("NAFDAC number"); map them to schema keys. */
function keyFor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("nafdac")) return "nafdac_no";
  if (l.includes("manufact")) return "manufacturer";
  if (l.includes("colo")) return "pill_color";
  if (l.includes("shape")) return "pill_shape";
  if (l.includes("strength")) return "strength";
  if (l.includes("dose") && !l.includes("frequency")) return "dose";
  if (l.includes("frequen") || l.includes("times")) return "frequency_per_day";
  if (l.includes("duration") || l.includes("days")) return "duration_days";
  if (l.includes("food")) return "with_food";
  if (l.includes("name") || l.includes("drug")) return "drug_name";
  if (l.includes("form")) return "form";
  return "";
}

/** Fields the patient must have before the scan counts as a good read. */
export const KEY_FIELDS = ["drug_name", "dose", "strength", "frequency_per_day"];

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase());
}

/** Default pill shape from the form word when the scanner gives none. */
export function shapeForForm(form: string): PillShape {
  const f = form.toLowerCase();
  if (f.includes("capsule")) return "capsule";
  if (f.includes("inhaler") || f.includes("puff")) return "inhaler";
  if (f.includes("syrup") || f.includes("liquid") || f.includes("suspension") || f.includes("drop")) return "liquid";
  if (f.includes("inject") || f.includes("insulin") || f.includes("vial")) return "injection";
  if (f.includes("caplet") || f.includes("oval")) return "oval";
  return "round";
}
