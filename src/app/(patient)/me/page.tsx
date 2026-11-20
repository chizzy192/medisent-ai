import { tr, formatDate } from "@/lib/strings";
import { signOut } from "@/lib/auth/actions";
import { AccessibilityForm } from "@/components/AccessibilityForm";
import { CaregiverSection, type CaregiverItem } from "@/components/CaregiverSection";
import { createClient } from "@/lib/db/server";
import { demoMode } from "@/lib/db/env";
import { StatusChip } from "@/components/StatusChip";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionLabel } from "@/components/ui";
import { getSession, requireRole } from "@/lib/auth/dal";
import { isTextSize } from "@/lib/accessibility";

/**
 * "Me" (section 3): the account, hospital, accessibility (text size, high contrast,
 * speech speed) and sign-out. Later stages add Caregivers, Refills, Records and Privacy here.
 */
export default async function MePage() {
  await requireRole(["patient", "doctor", "pharmacist", "nurse", "hospital_admin", "platform_admin"]);
  const session = (await getSession())!;
  const { profile, hospital } = session;
  const t = tr("me");
  const tAccess = tr("access");
  let caregivers: CaregiverItem[] = [];
  if (profile.role === "patient") {
    const supabase = await createClient();
    const [{ data: cgs }, { data: last }] = await Promise.all([
      supabase.from("caregivers").select("id,full_name,relationship,phone,notify_after_missed,status").eq("active", true).order("full_name"),
      supabase.from("caregiver_alerts").select("caregiver_id,sent_at").order("sent_at", { ascending: false }).limit(50),
    ]);
    const lastBy = new Map<string, string>();
    for (const a of last ?? []) if (!lastBy.has(a.caregiver_id)) lastBy.set(a.caregiver_id, formatDate(new Date(a.sent_at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }));
    caregivers = ((cgs ?? []) as Omit<CaregiverItem, "lastAlert">[]).map((c) => ({ ...c, lastAlert: lastBy.get(c.id) ?? null }));
  }

  const rows: { label: string; value: string | null }[] = [
    { label: t("role"), value: t(`roles.${profile.role}`) },
    { label: t("hospital"), value: hospital?.name ?? t("noHospital") },
    { label: t("phone"), value: profile.phone },
    { label: profile.role === "patient" ? t("hospitalNumber") : t("staffId"), value: profile.role === "patient" ? profile.hospital_number : profile.staff_id },
    ...(profile.licence_no ? [{ label: t("licence"), value: `${profile.licence_body} ${profile.licence_no}` }] : []),
  ];

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-5 sm:px-6">
      <div>
        <SectionLabel>{t("label")}</SectionLabel>
        <h1 className="mt-1 text-2xl [overflow-wrap:anywhere]">{profile.full_name}</h1>
        <div className="mt-2">
          <StatusChip tone={profile.verified_status === "verified" ? "success" : "warning"}>{t(`status.${profile.verified_status}`)}</StatusChip>
        </div>
      </div>

      <Card as="section">
        <dl className="divide-y divide-surface-2">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
              <dt className="text-base text-ink-2">{row.label}</dt>
              <dd className="font-mono text-base [overflow-wrap:anywhere]">{row.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {profile.role === "patient" && (
        <Card as="section" id="caregivers">
          <h2 className="text-xl">{t("caregiversTitle")}</h2>
          <div className="mt-3">
            <CaregiverSection items={caregivers} demo={demoMode} />
          </div>
        </Card>
      )}

      <Card as="section" id="accessibility">
        <h2 className="text-xl">{tAccess("title")}</h2>
        <p className="mt-1 text-base text-ink-2">{tAccess("intro")}</p>
        <div className="mt-4">
          <AccessibilityForm
            textSize={isTextSize(profile.text_size) ? profile.text_size : "normal"}
            highContrast={Boolean(profile.high_contrast)}
            speechRate={Number(profile.speech_rate) || 1}
            sample={tAccess("sample")}
          />
        </div>
      </Card>

      <form action={signOut}>
        <SubmitButton variant="outline" pendingLabel={t("signingOut")} className="w-full sm:w-auto">
          {t("signOut")}
        </SubmitButton>
      </form>
    </main>
  );
}
