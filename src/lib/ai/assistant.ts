import { createAdminClient } from "@/lib/db/admin";
import { loadCourses } from "@/lib/course";
import { raiseAlert } from "@/lib/alerts";
import { generateJson, isGeminiConfigured } from "./gemini";
import { answerBreaksRules, contextText, ensureCallOffer, isMissedDoseQuestion, MISSED_DOSE_FALLBACK, SAFE_FALLBACK, systemPrompt, type AssistantContext, type ContextMed } from "./answer-rules";

/**
 * Ask assistant (BUILD_PLAN Stage 3): the patient's own record is the only knowledge. The
 * red-flag layer runs before this (src/lib/ai/redflags.ts); this file builds the context,
 * calls Gemini, then checks the answer against the hard rules and replaces anything that
 * breaks them. Every answer is saved to assistant_messages; unsure answers raise a pharmacist
 * alert of type "question".
 */
export type AssistantReply = { answer: string; unsure: boolean; redFlag: boolean; messageId: string | null; guarded: string | null };

type ModelOut = { answer: string; red_flag: boolean; unsure: boolean };
const schema = {
  type: "object",
  properties: {
    answer: { type: "string", description: "At most 4 short sentences of plain English, ending with the pharmacist offer." },
    red_flag: { type: "boolean" },
    unsure: { type: "boolean", description: "true when the context did not answer the question" },
  },
  required: ["answer", "red_flag", "unsure"],
};

export async function buildContext(patientId: string): Promise<AssistantContext> {
  const admin = createAdminClient();
  const [{ data: meds }, { data: allergies }, { data: conditions }, { data: posts }, courses] = await Promise.all([
    admin.from("prescriptions").select("id,drug_name,strength,dose,instructions_plain,status").eq("patient_id", patientId).eq("active", true).neq("status", "rejected"),
    admin.from("allergies").select("substance").eq("patient_id", patientId),
    admin.from("conditions").select("name").eq("patient_id", patientId),
    admin.from("forum_posts").select("id,title,body").eq("status", "published").limit(8),
    loadCourses(admin, { patientId }).catch(() => []),
  ]);
  const courseById = new Map(courses.map((c) => [c.prescriptionId, `day ${c.day} of ${c.durationDays}, ${c.left} doses left${c.atRisk ? ", at risk (missed doses)" : ""}`]));
  const list: ContextMed[] = (meds ?? []).map((m) => ({
    name: m.drug_name,
    strength: m.strength,
    dose: m.dose,
    instruction: m.instructions_plain,
    status: m.status === "pending" ? "pending" : m.status === "edited" ? "edited" : "verified",
    course: courseById.get(m.id) ?? null,
  }));
  return { meds: list, allergies: (allergies ?? []).map((a) => a.substance), conditions: (conditions ?? []).map((c) => c.name), forumPosts: (posts ?? []).map((p) => ({ id: p.id, title: p.title, body: p.body })) };
}

export async function askAssistant(args: { patientId: string; hospitalId: string | null; question: string; redFlag: boolean }): Promise<AssistantReply> {
  const admin = createAdminClient();
  const question = args.question.trim().slice(0, 500);
  const context = await buildContext(args.patientId);
  const recorded = context.meds.map((m) => m.instruction ?? "").filter(Boolean);

  let answer: string;
  let unsure = false;
  let guarded: string | null = null;
  let modelRedFlag = false;

  if (args.redFlag) {
    answer = "This needs a person now, not the app. Please use the emergency screen to call for help.";
  } else if (!isGeminiConfigured()) {
    answer = SAFE_FALLBACK;
    unsure = true;
    guarded = "not-configured";
  } else {
    try {
      const out = await generateJson<ModelOut>(systemPrompt(), `${contextText(context)}\n\nQUESTION: ${question}`, schema);
      answer = String(out.answer ?? "").trim();
      unsure = Boolean(out.unsure);
      modelRedFlag = Boolean(out.red_flag);
      guarded = answerBreaksRules(answer, recorded);
      if (guarded) answer = isMissedDoseQuestion(question) ? MISSED_DOSE_FALLBACK : SAFE_FALLBACK;
      if (!answer) {
        answer = SAFE_FALLBACK;
        unsure = true;
      }
      answer = ensureCallOffer(answer);
    } catch (error) {
      console.error("[assistant]", error);
      answer = SAFE_FALLBACK;
      unsure = true;
      guarded = "model-error";
    }
  }

  const { data: saved } = await admin
    .from("assistant_messages")
    .insert({ patient_id: args.patientId, question, answer, escalated: unsure || args.redFlag, red_flag: args.redFlag || modelRedFlag, unsure })
    .select("id")
    .single();
  if (unsure && !args.redFlag && args.hospitalId) {
    await raiseAlert({ patientId: args.patientId, hospitalId: args.hospitalId, type: "question", detail: `Question the app could not answer from the record: "${question}"`, source: "assistant" }).catch((e) => console.error("[assistant alert]", e));
  }
  if (guarded) console.info(`[assistant] guard=${guarded}`);
  return { answer, unsure, redFlag: args.redFlag || modelRedFlag, messageId: saved?.id ?? null, guarded };
}
