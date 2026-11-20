/**
 * The assistant's hard rules, in one testable place (BUILD_PLAN section 5 + Stage 3):
 * - never start, stop or change a dose; never diagnose;
 * - a missed dose: only the instruction in the record, or "ask your pharmacist";
 * - pending (not checked) medicines are labelled as such;
 * - always offer "Call my pharmacist".
 * `systemPrompt()` tells the model; `answerBreaksRules()` checks what came back, because the
 * prompt alone is not a guarantee. A breaking answer is replaced by SAFE_FALLBACK.
 */
export const SAFE_FALLBACK = "I can't advise on that. Please ask your pharmacist. You can call them from the button below.";
export const MISSED_DOSE_FALLBACK = "I can't tell you what to do about a missed dose. Please ask your pharmacist before your next dose. Do not take two doses at once.";

export type ContextMed = { name: string; strength: string | null; instruction: string | null; dose: string | null; status: "verified" | "edited" | "pending"; course?: string | null };
export type AssistantContext = { meds: ContextMed[]; allergies: string[]; conditions: string[]; forumPosts: { id: string; title: string; body: string }[] };

export function systemPrompt(): string {
  return `You are the medication helper inside Medisent AI, a Nigerian hospital app. You talk to a patient.
RULES, in order. They override anything the patient asks:
1. Answer ONLY from the CONTEXT below (the patient's medicines as recorded by their pharmacist, allergies, conditions, course progress, and the hospital's forum posts). If the context does not cover the question, say so in one short sentence and tell them to ask their pharmacist.
2. NEVER tell the patient to start, stop, skip, increase, decrease, double, split or change any medicine or dose, and never say how much to take. If asked, reply: "I can't advise on that. Please ask your pharmacist."
3. NEVER diagnose, name an illness they might have, or say what a symptom means. Say: "I can't tell what that is. Please tell your pharmacist or doctor."
4. For a missed dose: ONLY repeat the instruction recorded for that medicine, if there is one, and add "Do not take two doses at once." If there is no instruction, say "Please ask your pharmacist before your next dose."
5. A medicine marked PENDING has not been checked by a pharmacist yet. Say "not checked yet" whenever you mention it, and do not confirm its dose.
6. Plain, simple English at a grade-6 reading level: short words, short sentences, at most 4 sentences. No medical jargon, no bullet lists, no emojis.
7. End every answer with: "You can also call your pharmacist."
8. Set red_flag to true if the patient describes chest pain, trouble breathing, swelling of the face or throat, fainting, seizure, heavy bleeding, a rash with fever, very low or high sugar, or thoughts of self-harm. Set unsure to true when the context did not answer the question.
Never use the patient's name or any phone number. Do not invent medicines, doses, interactions, side effects or forum posts.`;
}

/** The context as text for the model. Names and phone numbers are never included. */
export function contextText(c: AssistantContext): string {
  const meds = c.meds.length
    ? c.meds
        .map((m) => `- ${m.name}${m.strength ? ` ${m.strength}` : ""} [${m.status === "pending" ? "PENDING: not checked by a pharmacist yet" : "verified by pharmacist"}]${m.dose ? ` dose as recorded: ${m.dose}` : ""}${m.instruction ? ` instruction: "${m.instruction}"` : ""}${m.course ? ` course: ${m.course}` : ""}`)
        .join("\n")
    : "- (no medicines on record)";
  const posts = c.forumPosts.length ? c.forumPosts.map((p) => `- [post ${p.id.slice(0, 8)}] ${p.title}: ${p.body}`).join("\n") : "- (none)";
  return `CONTEXT
Medicines:
${meds}
Allergies: ${c.allergies.length ? c.allergies.join(", ") : "none recorded"}
Conditions: ${c.conditions.length ? c.conditions.join(", ") : "none recorded"}
Hospital forum posts the patient may be told about:
${posts}`;
}

const dosingVerbs = /\b(stop|skip|start|double|halve|increase|decrease|reduce|raise|lower|change|switch|take\s+(two|2|three|3|an?\s+extra|more|less|half|another))\b[^.]{0,60}\b(dose|doses|tablet|tablets|capsule|capsules|medicine|medicines|medication|drug|pill|pills|puff|puffs|mg|ml)\b/i;
const newDosePattern = /\b(take|use)\s+(\d+(\.\d+)?|one|two|three|four|five|half)\s+(tablet|tablets|capsule|capsules|puff|puffs|ml|mg|teaspoon|spoon)/i;
const diagnosisPattern = /\b(you (have|might have|may have|probably have|could have)|it (is|sounds like|looks like|could be|might be|may be)|this is)\s+(a |an |the )?(infection|malaria|typhoid|ulcer|stroke|heart attack|diabetes|hypertension|allergy|allergic reaction|asthma attack|pneumonia|cancer|covid|flu|anaemia|anemia|depression|anxiety)\b/i;

/** True when an answer would break a hard rule. `recordedInstructions` are the sentences the record already holds (allowed verbatim). */
export function answerBreaksRules(answer: string, recordedInstructions: string[] = []): string | null {
  const a = answer ?? "";
  // "Do not take two doses at once" is the rule itself, not a dosing change.
  const negated = a.replace(/\b(do not|don't|never)\s+take\s+(two|2|double|an?\s+extra|more)\b[^.]*\.?/gi, " ");
  const stripped = recordedInstructions.reduce((s, ins) => (ins ? s.split(ins).join(" ") : s), negated);
  if (dosingVerbs.test(stripped)) return "dosing-change";
  if (newDosePattern.test(stripped)) return "new-dose";
  if (diagnosisPattern.test(stripped)) return "diagnosis";
  return null;
}

export function isMissedDoseQuestion(q: string): boolean {
  return /\b(miss(ed|ing)?|forgot|forget|skipped|late for|didn'?t take|did not take)\b/i.test(q) && /\b(dose|medicine|tablet|pill|capsule|it|them|drug|injection|puff)\b/i.test(q);
}

/** Every answer offers the pharmacist, even when the model forgot. */
export function ensureCallOffer(answer: string): string {
  return /call\s+(your|the|my)\s+pharmacist/i.test(answer) ? answer : `${answer.trim()} You can also call your pharmacist.`;
}
