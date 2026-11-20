import { createAdminClient } from "@/lib/db/admin";
import { raiseAlert } from "@/lib/alerts";
import { recalcRisk } from "@/lib/risk";
import { generateJson, isGeminiConfigured } from "./gemini";
import { detectRedFlag, type RedFlag } from "./redflags";

/**
 * Daily check-in parser (BUILD_PLAN Stage 3): three answers (how do you feel, any side effects,
 * any problems taking your medicines) → mood, side effects, red flag. The red-flag rules run
 * first and never depend on the model; the model only normalises free text into the fields.
 * A side effect of a current medicine raises a staff alert.
 */
export type CheckinAnswers = { feeling: string; sideEffects: string; problems: string };
export type CheckinResult = { mood: "good" | "okay" | "low"; sideEffects: string[]; redFlag: RedFlag | null; problems: string; checkinId: string | null; alerted: boolean };

const schema = {
  type: "object",
  properties: {
    mood: { type: "string", enum: ["good", "okay", "low"] },
    side_effects: { type: "array", items: { type: "string" }, description: "Short lowercase words: dizziness, nausea, rash, headache, stomach pain, …; empty when none" },
    problems: { type: "string", description: "One short plain-English sentence about problems taking the medicines, or empty" },
  },
  required: ["mood", "side_effects", "problems"],
};

const moodWords: [RegExp, CheckinResult["mood"]][] = [
  [/\b(terrible|awful|very bad|really bad|worse|weak|sick|tired|low|sad|down|not good|no good|bad|unwell|poorly|depressed|hopeless)\b/, "low"],
  [/\b(okay|ok|fine|so so|so-so|not bad|alright|manageable|fair)\b/, "okay"],
  [/\b(good|great|well|better|fine today|strong|happy|very well|excellent)\b/, "good"],
];
const knownEffects = ["dizziness", "dizzy", "nausea", "vomiting", "rash", "itching", "headache", "stomach pain", "stomach ache", "diarrhoea", "diarrhea", "constipation", "cough", "drowsy", "sleepy", "tired", "weakness", "swelling", "palpitations", "blurred vision", "dry mouth", "sweating", "shaking", "fever"];

/** Rules-only parse, used when the model is off and as the floor the model cannot go below. */
export function parseLocally(a: CheckinAnswers): Omit<CheckinResult, "checkinId" | "alerted"> {
  const all = `${a.feeling}. ${a.sideEffects}. ${a.problems}`;
  const redFlag = detectRedFlag(all);
  const f = a.feeling.toLowerCase();
  let mood: CheckinResult["mood"] = "okay";
  for (const [re, m] of moodWords) if (re.test(f)) { mood = m; break; }
  const s = a.sideEffects.toLowerCase();
  const none = /^\s*(no|none|nothing|nope|no side effects?|not really|nil)\b/.test(s);
  const sideEffects = none ? [] : [...new Set(knownEffects.filter((k) => s.includes(k)).map((k) => (k === "dizzy" ? "dizziness" : k === "stomach ache" ? "stomach pain" : k === "diarrhea" ? "diarrhoea" : k === "sleepy" ? "drowsy" : k)))];
  if (!none && !sideEffects.length && s.trim().length > 2) sideEffects.push(s.trim().slice(0, 60));
  return { mood, sideEffects, redFlag, problems: a.problems.trim().slice(0, 300) };
}

export async function recordCheckin(args: { patientId: string; hospitalId: string | null; answers: CheckinAnswers }): Promise<CheckinResult> {
  const admin = createAdminClient();
  const local = parseLocally(args.answers);
  let parsed = local;
  if (isGeminiConfigured() && !local.redFlag) {
    try {
      const out = await generateJson<{ mood: CheckinResult["mood"]; side_effects: string[]; problems: string }>(
        "You turn a patient's daily check-in into fields. Never diagnose, never advise. Keep words plain. Do not invent side effects that were not mentioned.",
        `How do you feel: "${args.answers.feeling}"\nAny side effects: "${args.answers.sideEffects}"\nAny problems taking your medicines: "${args.answers.problems}"`,
        schema,
      );
      parsed = { ...local, mood: ["good", "okay", "low"].includes(out.mood) ? out.mood : local.mood, sideEffects: [...new Set([...local.sideEffects, ...(out.side_effects ?? []).map((x) => String(x).toLowerCase().slice(0, 40))])].slice(0, 6), problems: (out.problems || local.problems).slice(0, 300) };
    } catch (error) {
      console.error("[checkin model]", error);
    }
  }

  const { data: row, error } = await admin
    .from("checkins")
    .insert({ patient_id: args.patientId, transcript: `${args.answers.feeling} | ${args.answers.sideEffects} | ${args.answers.problems}`.slice(0, 1000), mood: parsed.mood, side_effects: parsed.sideEffects, red_flag: Boolean(parsed.redFlag), answers: args.answers, problems: parsed.problems || null })
    .select("id")
    .single();
  if (error) throw new Error(`checkins: ${error.message}`);

  let alerted = false;
  if (parsed.sideEffects.length && args.hospitalId) {
    const { data: meds } = await admin.from("prescriptions").select("drug_name").eq("patient_id", args.patientId).eq("active", true).neq("status", "rejected");
    const { data: patient } = await admin.from("profiles").select("full_name").eq("id", args.patientId).maybeSingle();
    const drugs = (meds ?? []).map((m) => m.drug_name).join(", ") || "no recorded medicine";
    await raiseAlert({ patientId: args.patientId, hospitalId: args.hospitalId, type: "side_effect", detail: `${patient?.full_name ?? "Patient"} reported ${parsed.sideEffects.join(", ")} at check-in (current medicines: ${drugs}).${parsed.problems ? ` Problems: ${parsed.problems}` : ""}`, source: "checkin" });
    alerted = true;
  }
  await recalcRisk(args.patientId, args.hospitalId).catch((e) => console.error("[risk]", e));
  return { ...parsed, checkinId: row?.id ?? null, alerted };
}
