import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { askAssistant } from "@/lib/ai/assistant";
import { detectRedFlag } from "@/lib/ai/redflags";
import { escalateRedFlag } from "@/lib/redflag-flow";

/**
 * POST { question } → { answer, redFlag: { kind, label } | null, unsure, messageId }.
 * The red-flag rules run BEFORE the model; a hit skips the model, raises the staff alert,
 * tells the caregivers and sends the app to the red-flag screen. Patients only.
 */
export type AssistantResponse = { answer: string; redFlag: { kind: "emergency" | "crisis"; label: string } | null; unsure: boolean; messageId: string | null };

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.profile.role !== "patient" || session.profile.verified_status !== "verified") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { question?: unknown };
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!question) return NextResponse.json({ error: "question_required" }, { status: 400 });

  const flag = detectRedFlag(question);
  if (flag) await escalateRedFlag({ patientId: session.profile.id, hospitalId: session.profile.hospital_id, flag, source: "assistant", text: question });
  try {
    const reply = await askAssistant({ patientId: session.profile.id, hospitalId: session.profile.hospital_id, question, redFlag: Boolean(flag) });
    const response: AssistantResponse = { answer: reply.answer, redFlag: flag ? { kind: flag.kind, label: flag.label } : null, unsure: reply.unsure, messageId: reply.messageId };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[assistant route]", error);
    return NextResponse.json({ error: "assistant_failed" }, { status: 502 });
  }
}
