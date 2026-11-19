import { NextResponse } from "next/server";
import { isLocale } from "@/config/locales";
import { getSession } from "@/lib/auth/dal";
import { isTtsConfigured, synthesize } from "@/lib/speech/tts";

/**
 * POST { text, language } → audio/mpeg (BUILD_PLAN section 5, "Instruction builder + speech").
 * Signed-in users only; 400 characters max; 204 when no provider is available so the browser
 * falls back to its own voice. Never receives names or phone numbers (the caller sends the
 * instruction sentence only).
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { text?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 400) : "";
  const language = isLocale(body.language) ? body.language : session.profile.language;
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });
  if (!isTtsConfigured(language)) return new NextResponse(null, { status: 204, headers: { "X-Voice": "none" } });

  try {
    const result = await synthesize(text, language);
    if (!result) return new NextResponse(null, { status: 204, headers: { "X-Voice": "none" } });
    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.mime,
        "Cache-Control": "private, max-age=86400",
        "X-Voice": result.provider,
        "X-Voice-Cached": result.cached ? "1" : "0",
      },
    });
  } catch (error) {
    console.error("[speak]", error);
    return new NextResponse(null, { status: 204, headers: { "X-Voice": "none" } });
  }
}
