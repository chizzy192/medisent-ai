import { notFound } from "next/navigation";
import { ReminderSheet } from "@/components/ReminderSheet";
import type { PillShape } from "@/components/PillIcon";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";
import { lagosDate, lagosInstant, timeLabel } from "@/lib/reminders";

/**
 * Reminder screen (BUILD_PLAN Stage 2): /reminder/<reminderId>?at=<ISO> opened from a
 * notification or the timeline. Plays the voice note and logs Taken / Snooze / Missed.
 */
export default async function ReminderPage({ params, searchParams }: PageProps<"/reminder/[id]">) {
  const { profile } = await requireRole(patientRoles);
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: reminder } = await supabase.from("reminders").select("id,prescription_id,time_of_day").eq("id", id).maybeSingle();
  if (!reminder) notFound();
  const { data: p } = await supabase.from("prescriptions").select("drug_name,strength,dose,instructions_plain,pill_shape,pill_color").eq("id", reminder.prescription_id).maybeSingle();
  if (!p) notFound();

  const at = typeof query.at === "string" && !Number.isNaN(Date.parse(query.at)) ? new Date(query.at) : lagosInstant(lagosDate(), reminder.time_of_day.slice(0, 5));
  const { data: log } = await supabase.from("dose_logs").select("status").eq("reminder_id", id).eq("scheduled_at", at.toISOString()).maybeSingle();

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-5 sm:px-6">
      <ReminderSheet
        reminderId={id}
        scheduledAt={at.toISOString()}
        time={timeLabel(at)}
        name={p.drug_name}
        strength={p.strength ?? ""}
        dose={p.dose ?? ""}
        instruction={p.instructions_plain ?? ""}
        pill={{ shape: p.pill_shape as PillShape, color: p.pill_color }}
        rate={Number(profile.speech_rate) || 1}
        alreadyLogged={log?.status ?? null}
      />
    </main>
  );
}
