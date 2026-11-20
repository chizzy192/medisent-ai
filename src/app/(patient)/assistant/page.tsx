import { tr } from "@/lib/strings";
import { AssistantChat, type ChatMessage } from "@/components/assistant/AssistantChat";
import { SectionLabel } from "@/components/ui";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";

/** Ask tab: the patient's record answers in plain English, by voice or text. */
export default async function AssistantPage() {
  const { profile, hospital } = await requireRole(patientRoles);
  const t = tr("assistant");
  const supabase = await createClient();
  const { data } = await supabase.from("assistant_messages").select("id,question,answer,created_at,unsure,red_flag").eq("red_flag", false).order("created_at", { ascending: false }).limit(10);
  const history: ChatMessage[] = (data ?? []).reverse().map((m) => ({ id: m.id, question: m.question, answer: m.answer ?? "", createdAt: m.created_at, unsure: Boolean(m.unsure) }));
  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-5 sm:px-6">
      <div>
        <SectionLabel>{t("label")}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-1 text-base text-ink-2">{t("intro")}</p>
      </div>
      <AssistantChat history={history} rate={Number(profile.speech_rate) || 1} pharmacistPhone={hospital?.contact_phone ?? null} hospitalName={hospital?.name ?? null} />
    </main>
  );
}
