import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { isSttConfigured, transcribe } from "@/lib/speech/stt";

/** POST multipart { audio } → { text } through Spitch STT (English). 503 when no key, 422 when nothing was heard. */
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.profile.verified_status !== "verified") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSttConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "audio_required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "audio_too_big" }, { status: 413 });
  const started = Date.now();
  try {
    const text = await transcribe(new Uint8Array(await file.arrayBuffer()), file.type || "audio/webm");
    console.info(`[listen] status=${text ? 200 : 422} bytes=${file.size} ms=${Date.now() - started}`);
    if (!text) return NextResponse.json({ error: "no_speech" }, { status: 422 });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[listen]", error);
    return NextResponse.json({ error: "stt_failed" }, { status: 502 });
  }
}
