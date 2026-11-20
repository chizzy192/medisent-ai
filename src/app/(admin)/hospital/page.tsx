import Link from "next/link";
import { tr } from "@/lib/strings";
import { Card, SectionLabel } from "@/components/ui";
import { StatusChip } from "@/components/StatusChip";
import { adminRoles, requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";

/** Hospital admin dashboard: counts, open blocks, and the way to the roster and verifications. */
export default async function HospitalPage() {
  const { profile, hospital } = await requireRole(adminRoles);
  const t = tr("hospitalDashboard");
  const admin = createAdminClient();
  const hospitalId = profile.hospital_id!;
  const [roster, registry, staff, patients, blocked, alerts] = await Promise.all([
    admin.from("staff_roster").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId),
    admin.from("patient_registry").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).neq("role", "patient"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("role", "patient"),
    admin.from("verification_attempts").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).not("blocked_at", "is", null),
    admin.from("alerts").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "open"),
  ]);

  const stats = [
    { key: "rosterCount", value: roster.count ?? 0, href: "/roster" },
    { key: "registryCount", value: registry.count ?? 0, href: "/roster" },
    { key: "staffJoined", value: staff.count ?? 0, href: "/verifications" },
    { key: "patientsJoined", value: patients.count ?? 0, href: "/verifications" },
  ];

  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{t("label")}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("welcome", { hospital: hospital?.name ?? "" })}</h1>
        <p className="mt-2 text-base text-ink-2">{t("intro", { name: profile.full_name })}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip tone={hospital?.status === "approved" ? "success" : "warning"}>{t(`status.${hospital?.status ?? "pending"}`)}</StatusChip>
          {(blocked.count ?? 0) > 0 && <StatusChip tone="danger">{t("blockedChip", { count: blocked.count ?? 0 })}</StatusChip>}
          {(alerts.count ?? 0) > 0 && <StatusChip tone="warning">{t("alertsChip", { count: alerts.count ?? 0 })}</StatusChip>}
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.key}>
            <Link href={s.href} className="block rounded-card border border-border bg-surface p-4 hover:border-primary">
              <p className="font-mono text-3xl font-medium text-ink">{s.value}</p>
              <p className="mt-1 text-base text-ink-2">{t(s.key)}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="text-xl">{t("rosterTitle")}</h2>
          <p className="mt-1 text-base text-ink-2">{t("rosterBody")}</p>
          <Link href="/roster" className="btn-primary mt-4">
            {t("rosterAction")}
          </Link>
        </Card>
        <Card>
          <h2 className="text-xl">{t("verifyTitle")}</h2>
          <p className="mt-1 text-base text-ink-2">{t("verifyBody")}</p>
          <Link href="/verifications" className="btn-outline mt-4">
            {t("verifyAction")}
          </Link>
        </Card>
      </div>
    </main>
  );
}
