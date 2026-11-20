import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { isTtsConfigured, synthesize } from "@/lib/speech/tts";

/**
 * POST { text } → audio/mpeg (English only, one Spitch voice). Signed-in users only; 400
 * characters max. 204 when Spitch did not answer (the browser then uses its English voice,
 * labelled "Offline voice"). Every call is logged with status, provider and timing. Never
 * receives names or phone numbers (callers send the sentence only).
 */
export async function POST(request: Request) {
  const started = Date.now();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 400) : "";
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });
  if (!isTtsConfigured()) {
    console.info(`[speak] status=204 provider=none reason=not_configured`);
    return new NextResponse(null, { status: 204, headers: { "X-Voice": "none" } });
  }

  try {
    const result = await synthesize(text);
    if (!result) {
      console.info(`[speak] status=204 provider=none ms=${Date.now() - started}`);
      return new NextResponse(null, { status: 204, headers: { "X-Voice": "none" } });
    }
    console.info(`[speak] status=200 provider=${result.provider} voice=${result.voice} cached=${result.cached} bytes=${result.bytes.byteLength} ms=${Date.now() - started}`);
    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.mime,
        "Cache-Control": "private, max-age=86400",
        "X-Voice": result.cached ? "cache" : result.provider,
        "X-Voice-Name": result.voice,
      },
    });
  } catch (error) {
    console.error(`[speak] status=204 provider=error ms=${Date.now() - started}`, error);
    return new NextResponse(null, { status: 204, headers: { "X-Voice": "none" } });
  }
}
