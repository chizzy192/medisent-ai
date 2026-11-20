import Link from "next/link";
import { tr } from "@/lib/strings";
import { EmptyState } from "@/components/EmptyState";
import { StatusChip, type ChipTone } from "@/components/StatusChip";
import { Card, SectionLabel } from "@/components/ui";
import { requireRole, staffRoles } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";

type Row = { id: string; full_name: string; hospital_number: string | null; phone: string | null };
type Risk = { patient_id: string; score: number; band: "low" | "medium" | "high" };
const bandTone: Record<Risk["band"], ChipTone> = { low: "success", medium: "warning", high: "danger" };

/** Staff: the hospital's patients (RLS scoped), with the risk band from the seed; opens the patient page. */
export default async function PatientsPage() {
  const { hospital } = await requireRole(staffRoles);
  const t = tr("patients");
  const supabase = await createClient();
  const [{ data: rows }, { data: risks }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,hospital_number,phone").eq("role", "patient").order("full_name"),
    supabase.from("risk_scores").select("patient_id,score,band"),
  ]);
  const risk = new Map(((risks ?? []) as Risk[]).map((r) => [r.patient_id, r]));
  const patients = (rows ?? []) as Row[];

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <SectionLabel>{hospital?.name}</SectionLabel>
        <h1 className="mt-1 text-2xl">{t("title")}</h1>
        <p className="mt-1 font-mono text-sm text-ink-2">{t("count", { count: patients.length })}</p>
      </div>
      {patients.length === 0 ? (
        <EmptyState label={t("title")} title={t("emptyTitle")}>
          <p>{t("emptyBody")}</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {patients.map((p) => {
            const r = risk.get(p.id);
            return (
              <Card as="li" key={p.id} className="p-0">
                <Link href={`/patients/${p.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-3 p-4 hover:bg-bg">
                  <span className="min-w-0 flex-[1_1_12rem]">
                    <span className="block text-lg font-semibold [overflow-wrap:anywhere]">{p.full_name}</span>
                    <span className="block font-mono text-sm text-ink-2">
                      {p.hospital_number ?? "—"}
                    </span>
                  </span>
                  {r && (
                    <StatusChip tone={bandTone[r.band]}>
                      {t(`risk.${r.band}`)} <span className="font-mono">{r.score}</span>
                    </StatusChip>
                  )}
                </Link>
              </Card>
            );
          })}
        </ul>
      )}
    </main>
  );
}
