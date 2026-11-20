import { demoMode } from "@/lib/db/env";
import { isSmsConfigured } from "@/lib/db/secrets";

/**
 * Outbound SMS through Africa's Talking (BUILD_PLAN section 2). Stage 1 sends OTP codes;
 * Stage 5 adds reminders and caregiver alerts. In demo mode every message goes to
 * DEMO_TEST_PHONE when it is set, and is logged instead of sent when no keys exist.
 */
export type SmsResult = { sent: boolean; to: string; reason?: string };

export async function sendSms(to: string, text: string): Promise<SmsResult> {
  const target = demoMode && process.env.DEMO_TEST_PHONE ? process.env.DEMO_TEST_PHONE : to;

  if (!isSmsConfigured()) {
    console.info(`[sms:not-configured] to=${target} text=${JSON.stringify(text)}`);
    return { sent: false, to: target, reason: "not_configured" };
  }

  const username = process.env.AFRICASTALKING_USERNAME!;
  const base = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to: target, message: text });
  if (process.env.AFRICASTALKING_SENDER_ID) body.set("from", process.env.AFRICASTALKING_SENDER_ID);

  try {
    const res = await fetch(`${base}/version1/messaging`, {
      method: "POST",
      headers: {
        apiKey: process.env.AFRICASTALKING_API_KEY!,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) return { sent: false, to: target, reason: `http_${res.status}` };
    const json = (await res.json()) as { SMSMessageData?: { Recipients?: { status?: string }[] } };
    const status = json.SMSMessageData?.Recipients?.[0]?.status ?? "";
    return { sent: status.toLowerCase().startsWith("success"), to: target, reason: status };
  } catch (error) {
    return { sent: false, to: target, reason: error instanceof Error ? error.message : "network" };
  }
}
