import { createAdminClient } from "@/lib/db/admin";
import { notifyCaregivers, raiseAlert } from "@/lib/alerts";
import { recalcRisk } from "@/lib/risk";
import type { RedFlag } from "@/lib/ai/redflags";

/**
 * What happens when the red-flag layer fires (assistant question or check-in): a staff alert
 * with the matched words (never the whole text), caregivers told at once, risk recalculated.
 * The screen itself is /redflag (emergency) or /redflag?kind=crisis (helpline).
 */
export async function escalateRedFlag(args: { patientId: string; hospitalId: string | null; flag: RedFlag; source: "assistant" | "checkin"; text: string }): Promise<void> {
  const admin = createAdminClient();
  const { data: patient } = await admin.from("profiles").select("full_name").eq("id", args.patientId).maybeSingle();
  const name = patient?.full_name ?? "A patient";
  const what = args.flag.kind === "crisis" ? "self-harm words" : args.flag.matched.join(", ");
  await raiseAlert({
    patientId: args.patientId,
    hospitalId: args.hospitalId,
    type: "red_flag",
    detail: `${args.flag.kind === "crisis" ? "URGENT: " : ""}${name} mentioned ${what} in the ${args.source === "assistant" ? "assistant" : "daily check-in"}. Said: "${args.text.slice(0, 160)}"`,
    source: args.source,
    dedupeHours: 1,
  }).catch((e) => console.error("[redflag alert]", e));
  await notifyCaregivers({
    patientId: args.patientId,
    reason: "red_flag",
    text: `Medisent AI: ${name} reported ${args.flag.kind === "crisis" ? "being in distress" : args.flag.label} just now. Please check on them or call them. If it is an emergency call 112.`,
    slotKey: `redflag:${args.patientId}:${new Date().toISOString().slice(0, 13)}`,
  }).catch((e) => console.error("[redflag caregiver]", e));
  await recalcRisk(args.patientId, args.hospitalId).catch((e) => console.error("[risk]", e));
}
