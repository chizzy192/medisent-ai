import { NextResponse } from "next/server";
import { acceptByPhone } from "@/lib/caregivers";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Inbound SMS webhook (Africa's Talking posts form fields `from`, `text`, `to`, `id`, `date`).
 * Stage 3: a caregiver replying YES accepts the invitation. Stage 5 adds dose replies (1 / 2)
 * and questions. Every message is kept in inbound_sms. Answers 200 with plain text so the
 * gateway does not retry.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let from = "";
  let text = "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { from?: unknown; text?: unknown };
    from = String(body.from ?? "");
    text = String(body.text ?? "");
  } else {
    const form = await request.formData().catch(() => null);
    from = String(form?.get("from") ?? "");
    text = String(form?.get("text") ?? "");
  }
  if (!from || !text) return new NextResponse("ignored", { status: 200 });
  const admin = createAdminClient();
  let handled = "none";
  try {
    const accepted = await acceptByPhone(from, text);
    if (accepted) handled = `caregiver_accepted:${accepted}`;
  } catch (error) {
    handled = `error:${error instanceof Error ? error.message : String(error)}`;
  }
  await admin.from("inbound_sms").insert({ from_phone: from.slice(0, 32), text: text.slice(0, 500), handled });
  return new NextResponse(handled, { status: 200 });
}
