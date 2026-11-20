import Link from "next/link";
import { notFound } from "next/navigation";
import { tr, formatDate } from "@/lib/strings";
import { DrugCheckChip } from "@/components/DrugCheckChip";
import { MedicineCard } from "@/components/MedicineCard";
import type { PillShape } from "@/components/PillIcon";
import { StatusChip } from "@/components/StatusChip";
import { ButtonLink, Card, SectionLabel } from "@/components/ui";
import type { PrescriptionSource, PrescriptionStatus } from "@/lib/db/types";
import { requireRole, staffRoles } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";
import { loadCourses } from "@/lib/course";
import { AlertIcon } from "@/components/icons";
import type { DrugCheckResult } from "@/lib/drugcheck";

type Med = { id: string; drug_name: string; strength: string | null; dose: string | null; frequency_per_day: number; pill_shape: PillShape; pill_color: string; check_result: DrugCheckResult | null; source: PrescriptionSource; status: PrescriptionStatus; rejection_reason: string | null; created_at: string };
const statusTone: Record<PrescriptionStatus, "success" | "neutral" | "warning"> = { verified: "success", edited: "success", pending: "neutral", rejected: "warning" };

/** Staff: one patient (RLS: own hospital only), their medicines with review status, and the way to Dispense. */
export default async function PatientPage({ params }: PageProps<"/patients/[id]">) {
  await requireRole(staffRoles);
  const { id } = await params;
  const t = tr("patients");
  const supabase = await createClient();
  const weekAgo = new Date(new Date().getTime() - 7 * 86_400_000).toISOString();
  const { data: patient } = await supabase.from("profiles").select("id,full_name,hospital_number,phone,role").eq("id", id).eq("role", "patient").maybeSingle();
  if (!patient) notFound();
  const [{ data: meds }, { data: conditions }, { data: logs }, { data: interactionAlerts }, courses] = await Promise.all([
    supabase.from("prescriptions").select("id,drug_name,strength,dose,frequency_per_day,pill_shape,pill_color,check_result,source,status,rejection_reason,created_at").eq("patient_id", id).or("active.eq.true,status.eq.rejected").order("created_at", { ascending: false }),
    supabase.from("conditions").select("id,name").eq("patient_id", id),
    supabase.from("dose_logs").select("status").eq("patient_id", id).gte("scheduled_at", weekAgo),
    supabase.from("alerts").select("id,detail").eq("patient_id", id).eq("type", "interaction").eq("status", "open"),
    loadCourses(supabase, { patientId: id }).catch((e) => {
      console.error("[course]", e);
      return [];
    }),
  ]);
  const interactions = interactionAlerts ?? [];
  const list = (meds ?? []) as Med[];
  const week = logs ?? [];
  const takenPct = week.length ? Math.round((week.filter((l) => l.status === "taken" || l.status === "late").length / week.length) * 100) : null;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <Link href="/patients" className="text-base font-medium text-primary underline">
          {t("back")}
        </Link>
        <h1 className="mt-2 text-2xl [overflow-wrap:anywhere]">{patient.full_name}</h1>
        <p className="font-mono text-sm text-ink-2">
          {patient.hospital_number ?? "—"} · {patient.phone ?? "—"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(conditions ?? []).map((c) => (
            <StatusChip key={c.id} tone="neutral">
              {c.name}
            </StatusChip>
          ))}
          {takenPct !== null && <StatusChip tone={takenPct >= 80 ? "success" : "warning"}>{t("weekAdherence", { pct: takenPct })}</StatusChip>}
          <StatusChip tone={interactions.length ? "danger" : "neutral"}>{t("interactionAlerts", { count: interactions.length })}</StatusChip>
        </div>
      </div>

      {interactions.length > 0 && (
        <section aria-labelledby="interactions-title" className="space-y-2" data-testid="patient-interactions">
          <SectionLabel as="h2">
            <span id="interactions-title">{t("interactionsTitle")}</span>
          </SectionLabel>
          <ul className="space-y-2">
            {interactions.map((a) => (
              <li key={a.id} className="flex items-start gap-2 rounded-button border-2 border-danger bg-danger-tint p-3 text-base">
                <AlertIcon size={20} className="mt-0.5 shrink-0 text-danger" />
                <span>{a.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {courses.length > 0 && (
        <section aria-labelledby="courses-title" className="space-y-2">
          <SectionLabel as="h2">
            <span id="courses-title">{t("courses")}</span>
          </SectionLabel>
          <ul className="space-y-2">
            {courses.map((c) => (
              <li key={c.prescriptionId} className="flex flex-wrap items-center justify-between gap-2 rounded-button border border-border bg-surface p-3">
                <span className="font-semibold">
                  {c.drugName} <span className="font-mono text-sm font-medium text-ink-2">{c.strength}</span>
                </span>
                <span className="font-mono text-sm">{t("courseProgress", { day: c.day, total: c.durationDays, missed: c.missed })}</span>
                <StatusChip tone={c.atRisk ? "warning" : "success"}>{c.atRisk ? t("courseAtRisk") : t("courseOnTrack")}</StatusChip>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="meds-title" className="space-y-3">
        <SectionLabel as="h2">
          <span id="meds-title">{t("medicines")}</span>
        </SectionLabel>
        {list.length === 0 ? (
          <p className="text-base text-ink-2">{t("noMedicines")}</p>
        ) : (
          list.map((m) => (
            <MedicineCard
              key={m.id}
              name={m.drug_name}
              strength={m.strength ?? ""}
              time={formatDate(new Date(m.created_at), { day: "numeric", month: "short", timeZone: "Africa/Lagos" })}
              dose={`${m.dose ?? ""} · ${t("perDay", { count: m.frequency_per_day })}`}
              pill={{ shape: m.pill_shape, color: m.pill_color }}
              status={{ tone: statusTone[m.status], label: t(`status.${m.status}`) }}
              footer={
                <div className="flex flex-wrap items-center gap-2">
                  <DrugCheckChip result={m.check_result} />
                  <span className="font-mono text-sm text-ink-2">{t(`source.${m.source}`)}</span>
                  {m.status === "rejected" && m.rejection_reason && <span className="text-sm text-ink-2">· {m.rejection_reason}</span>}
                </div>
              }
            />
          ))
        )}
      </section>

      <Card as="section">
        <h2 className="text-xl">{t("addTitle")}</h2>
        <p className="mt-1 text-base text-ink-2">{t("addBody")}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`/dispense?patient=${patient.id}`}>{t("dispense")}</ButtonLink>
          {list.some((m) => m.status === "pending") && (
            <ButtonLink href="/verify" variant="outline">
              {t("reviewPending")}
            </ButtonLink>
          )}
        </div>
      </Card>
    </main>
  );
}
