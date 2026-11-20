import Link from "next/link";
import { tr } from "@/lib/strings";
import { EmptyState } from "@/components/EmptyState";
import { StatusChip } from "@/components/StatusChip";
import { ButtonLink, Card, SectionLabel } from "@/components/ui";
import { requireRole, staffRoles } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";

/**
 * Staff dashboard, Stage 1: branded welcome and live counts through RLS (the signed-in staff
 * member only sees their own hospital). Stage 5 adds the adherence charts and risk table.
 */
export default async function DashboardPage() {
  const { profile, hospital } = await requireRole(staffRoles);
  const t = tr("dashboard");
  const supabase = await createClient();
  const [patients, alerts, redFlags, pending] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open").eq("type", "red_flag"),
    supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("source", "self").eq("status", "pending"),
  ]);
  const canDispense = profile.role === "pharmacist" || profile.role === "doctor";

  const stats = [
    { key: "patients", value: patients.count ?? 0 },
    { key: "openAlerts", value: alerts.count ?? 0 },
    { key: "redFlags", value: redFlags.count ?? 0 },
    { key: "pendingChecks", value: pending.count ?? 0, href: canDispense ? "/verify" : undefined },
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

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card as="li" key={s.key} className={s.href ? "p-0" : ""}>
            {s.href ? (
              <Link href={s.href} className="block p-4 hover:bg-bg" data-testid="stat-pending">
                <p className="font-mono text-3xl font-medium">{s.value}</p>
                <p className="mt-1 text-base text-primary underline">{t(s.key)}</p>
              </Link>
            ) : (
              <>
                <p className="font-mono text-3xl font-medium">{s.value}</p>
                <p className="mt-1 text-base text-ink-2">{t(s.key)}</p>
              </>
            )}
          </Card>
        ))}
      </ul>

      {canDispense && (
        <Card as="section" className="space-y-3">
          <h2 className="text-xl">{t("intakeTitle")}</h2>
          <p className="text-base text-ink-2">{t("intakeBody")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dispense">{t("dispense")}</ButtonLink>
            <ButtonLink href="/verify" variant="outline">
              {t("verifyQueue", { count: pending.count ?? 0 })}
            </ButtonLink>
          </div>
        </Card>
      )}

      <EmptyState label={t("chartsLabel")} title={t("chartsTitle")}>
        <p>{t("chartsBody")}</p>
      </EmptyState>
    </main>
  );
}
