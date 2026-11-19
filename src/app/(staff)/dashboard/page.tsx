import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/EmptyState";
import { StatusChip } from "@/components/StatusChip";
import { Card, SectionLabel } from "@/components/ui";
import { requireRole, staffRoles } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";

/**
 * Staff dashboard, Stage 1: branded welcome and live counts through RLS (the signed-in staff
 * member only sees their own hospital). Stage 5 adds the adherence charts and risk table.
 */
export default async function DashboardPage() {
  const { profile, hospital } = await requireRole(staffRoles);
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const [patients, alerts, redFlags] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open").eq("type", "red_flag"),
  ]);

  const stats = [
    { key: "patients", value: patients.count ?? 0 },
    { key: "openAlerts", value: alerts.count ?? 0 },
    { key: "redFlags", value: redFlags.count ?? 0 },
  ];

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{t(`roles.${profile.role}`)}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("welcome", { hospital: hospital?.name ?? "" })}</h1>
        <p className="mt-2 text-base text-ink-2">{t("intro", { name: profile.full_name })}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip tone="success">{t("verifiedChip", { body: profile.licence_body ?? "", no: profile.licence_no ?? "" })}</StatusChip>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card as="li" key={s.key}>
            <p className="font-mono text-3xl font-medium">{s.value}</p>
            <p className="mt-1 text-base text-ink-2">{t(s.key)}</p>
          </Card>
        ))}
      </ul>

      <EmptyState label={t("chartsLabel")} title={t("chartsTitle")}>
        <p>{t("chartsBody")}</p>
      </EmptyState>
    </main>
  );
}
