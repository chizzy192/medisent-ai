import { CheckinFlow } from "@/components/checkin/CheckinFlow";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";
import { lagosDayStart } from "@/lib/reminders";

/** Daily check-in: three questions by tap, voice or text. */
export default async function CheckinPage() {
  const { profile } = await requireRole(patientRoles);
  const supabase = await createClient();
  const { count } = await supabase.from("checkins").select("id", { count: "exact", head: true }).gte("created_at", lagosDayStart().toISOString());
  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-5 sm:px-6">
      <CheckinFlow rate={Number(profile.speech_rate) || 1} alreadyToday={(count ?? 0) > 0} />
    </main>
  );
}
