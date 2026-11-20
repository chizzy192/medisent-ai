import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { recordCheckin, type CheckinAnswers } from "@/lib/ai/checkin";
import { escalateRedFlag } from "@/lib/redflag-flow";

/** POST { feeling, sideEffects, problems } → { mood, sideEffects, redFlag, problems, checkinId }. Patients only. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.profile.role !== "patient" || session.profile.verified_status !== "verified") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Partial<Record<keyof CheckinAnswers, unknown>>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 400) : "");
  const answers: CheckinAnswers = { feeling: str(body.feeling), sideEffects: str(body.sideEffects), problems: str(body.problems) };
  if (!answers.feeling && !answers.sideEffects && !answers.problems) return NextResponse.json({ error: "answers_required" }, { status: 400 });
  try {
    const result = await recordCheckin({ patientId: session.profile.id, hospitalId: session.profile.hospital_id, answers });
    if (result.redFlag) await escalateRedFlag({ patientId: session.profile.id, hospitalId: session.profile.hospital_id, flag: result.redFlag, source: "checkin", text: `${answers.feeling} ${answers.sideEffects} ${answers.problems}` });
    return NextResponse.json({ mood: result.mood, sideEffects: result.sideEffects, redFlag: result.redFlag ? { kind: result.redFlag.kind, label: result.redFlag.label } : null, problems: result.problems, checkinId: result.checkinId, alerted: result.alerted });
  } catch (error) {
    console.error("[checkin route]", error);
    return NextResponse.json({ error: "checkin_failed" }, { status: 502 });
  }
}
