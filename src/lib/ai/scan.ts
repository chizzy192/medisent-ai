/**
 * Pack reader (BUILD_PLAN section 5, "AI never decides a dose"): a photo of a medicine pack
 * in, the PRINTED fields out, each with its own confidence. Dosage is never read: the dose
 * comes from the pharmacist's record or the patient's own entry that a pharmacist checks.
 * Gemini with a response schema; the model name comes from GEMINI_MODEL with a fallback list.
 */
export type ReadField = { value: string | null; confidence: number };

export type PackRead = {
  drug_name: ReadField;
  strength: ReadField;
  form: ReadField;
  nafdac_no: ReadField;
  manufacturer: ReadField;
  batch_no: ReadField;
  expiry_date: ReadField; // YYYY-MM-DD or YYYY-MM
  barcode: ReadField;
  /** Always null: the model is told never to return a dose. Kept so the record is explicit. */
  dosage: null;
  /** Honesty about the whole reading, 0–1. */
  confidence: number;
};

export const PACK_FIELDS = ["drug_name", "strength", "form", "nafdac_no", "manufacturer", "batch_no", "expiry_date", "barcode"] as const;
export type PackField = (typeof PACK_FIELDS)[number];

/** Below this the app asks for another photo. */
export const CONFIDENCE_FLOOR = 0.6;

const field = (description: string) => ({
  type: "object",
  properties: {
    value: { type: "string", nullable: true, description },
    confidence: { type: "number", description: "0-1, how sure you are of this one field" },
  },
  required: ["value", "confidence"],
});

const schema = {
  type: "object",
  properties: {
    drug_name: field("Medicine (brand or generic) name as printed, without the strength"),
    strength: field('Strength as printed, e.g. "500 mg", "80/480 mg", "100 mcg/dose"'),
    form: field("tablet, capsule, syrup, suspension, inhaler, injection, cream, drops"),
    nafdac_no: field("NAFDAC registration number as printed after 'NAFDAC Reg. No.', e.g. A4-1234. Never invent one."),
    manufacturer: field("Manufacturer or marketing company as printed"),
    batch_no: field("Batch or lot number as printed"),
    expiry_date: field("Expiry date as printed, normalised to YYYY-MM-DD (or YYYY-MM when no day is printed)"),
    barcode: field("Digits of the EAN/UPC barcode if printed as numbers under the bars"),
    confidence: { type: "number", description: "0-1 for the whole reading" },
  },
  required: ["drug_name", "strength", "form", "nafdac_no", "manufacturer", "batch_no", "expiry_date", "barcode", "confidence"],
};

const prompt = `You read the PRINTED text on medicine packs for a Nigerian medication app.
Extract only what is printed for ONE medicine (the main one if several): name, strength, form,
NAFDAC registration number, manufacturer, batch number, expiry date, barcode digits.
NEVER read, guess or infer how much to take or how often: dosage is decided by a pharmacist, not by you.
Ignore any dosing text ("1 tab b.d.", "take two daily"); do not put it in any field.
Use null for anything you cannot see clearly and give that field a low confidence.
Never invent a NAFDAC number, a batch number or a manufacturer.
Write values in plain, simple English (grade-6 reading level); keep names, numbers and units exactly as printed.`;

const models = [process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-flash-latest"].filter(Boolean) as string[];

export async function readPack(image: Uint8Array, mime: string): Promise<PackRead> {
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

type RawField = { value?: unknown; confidence?: unknown } | null | undefined;

function readField(raw: RawField, clean: (v: string) => string | null = (v) => v): ReadField {
  const value = typeof raw?.value === "string" ? raw.value.trim() : "";
  const confidence = Math.min(1, Math.max(0, Number(raw?.confidence) || 0));
  const cleaned = value ? clean(value) : null;
  return { value: cleaned || null, confidence: cleaned ? confidence : 0 };
}

function normalise(raw: Record<string, RawField> & { confidence?: unknown }): PackRead {
  return {
    drug_name: readField(raw.drug_name, (v) => titleCase(v)),
    strength: readField(raw.strength, (v) => v.replace(/(\d)(mg|mcg|g|ml|iu)\b/gi, "$1 $2")),
    form: readField(raw.form, (v) => v.toLowerCase().replace(/s$/, "")),
    nafdac_no: readField(raw.nafdac_no, (v) => v.toUpperCase().replace(/^NAFDAC\s*(REG\.?\s*)?(NO\.?:?)?\s*/i, "").replace(/\s+/g, "").replace(/[–—]/g, "-")),
    manufacturer: readField(raw.manufacturer),
    batch_no: readField(raw.batch_no, (v) => v.toUpperCase().replace(/^(BATCH|LOT|B\.?N\.?)[\s:.]*/i, "")),
    expiry_date: readField(raw.expiry_date, normaliseExpiry),
    barcode: readField(raw.barcode, (v) => v.replace(/\D/g, "") || null),
    dosage: null,
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
  };
}

/** "2026-03", "03/2026", "MAR 2026", "2026-03-31" → YYYY-MM-DD (last day of month when no day). */
export function normaliseExpiry(v: string): string | null {
  const s = v.trim().toUpperCase();
  const months: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, SEPT: 9, OCT: 10, NOV: 11, DEC: 12 };
  let y: number | null = null;
  let m: number | null = null;
  let d: number | null = null;
  let match: RegExpMatchArray | null;
  if ((match = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/))) [y, m, d] = [Number(match[1]), Number(match[2]), match[3] ? Number(match[3]) : null];
  else if ((match = s.match(/^(\d{1,2})[/.-](\d{4})$/))) [m, y] = [Number(match[1]), Number(match[2])];
  else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = s.match(/^(\d{1,2})[/.-](\d{2})$/))) [m, y] = [Number(match[1]), 2000 + Number(match[2])];
  else if ((match = s.match(/^([A-Z]{3,4})[\s/.-]*(\d{4})$/)) && months[match[1]]) [m, y] = [months[match[1]], Number(match[2])];
  else if ((match = s.match(/^(\d{1,2})[\s/.-]*([A-Z]{3,4})[\s/.-]*(\d{4})$/)) && months[match[2]]) [d, m, y] = [Number(match[1]), months[match[2]], Number(match[3])];
  if (!y || !m || m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = d && d >= 1 && d <= last ? d : last;
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase());
}
