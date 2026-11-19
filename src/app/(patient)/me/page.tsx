import { getTranslations } from "next-intl/server";
import { signOut } from "@/lib/auth/actions";
import { AccessibilityForm } from "@/components/AccessibilityForm";
import { LanguageChoice } from "@/components/LanguageChoice";
import { StatusChip } from "@/components/StatusChip";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionLabel } from "@/components/ui";
import { getSession, requireRole } from "@/lib/auth/dal";
import { isTextSize } from "@/lib/accessibility";

/**
 * "Me" (section 3): the account, hospital, language, accessibility (text size, high contrast,
 * speech speed) and sign-out. Later stages add Caregivers, Refills, Records and Privacy here.
 */
export default async function MePage() {
  await requireRole(["patient", "doctor", "pharmacist", "nurse", "hospital_admin", "platform_admin"]);
  const session = (await getSession())!;
  const { profile, hospital } = session;
  const t = await getTranslations("me");
  const tAccess = await getTranslations("access");

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

      <Card as="section">
        <h2 className="text-xl">{t("language")}</h2>
        <p className="mt-1 text-base text-ink-2">{t("languageBody")}</p>
        <div className="mt-3">
          <LanguageChoice label={t("language")} />
        </div>
      </Card>

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

      <Card as="section">
        <h2 className="text-xl">{t("comingTitle")}</h2>
        <p className="mt-1 text-base text-ink-2">{t("comingBody")}</p>
      </Card>

      <form action={signOut}>
        <SubmitButton variant="outline" pendingLabel={t("signingOut")} className="w-full sm:w-auto">
          {t("signOut")}
        </SubmitButton>
      </form>
    </main>
  );
}
