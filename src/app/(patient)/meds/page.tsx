import { tr } from "@/lib/strings";
import { DrugCheckChip, DrugCheckNote } from "@/components/DrugCheckChip";
import { EmptyState } from "@/components/EmptyState";
import { ScanIcon } from "@/components/icons";
import { ListenButton } from "@/components/ListenButton";
import { MedicineCard } from "@/components/MedicineCard";
import type { PillShape } from "@/components/PillIcon";
import { Meter, ButtonLink, SectionLabel } from "@/components/ui";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";
import type { DrugCheckResult } from "@/lib/drugcheck";
import type { PrescriptionSource, PrescriptionStatus } from "@/lib/db/types";
import { StatusChip } from "@/components/StatusChip";
import { CourseCard } from "@/components/CourseCard";
import { loadCourses } from "@/lib/course";
import { daysLeft, lagosDate } from "@/lib/reminders";

type Med = {
  id: string;
  drug_name: string;
  strength: string | null;
  dose: string | null;
  frequency_per_day: number;
  instructions_plain: string | null;
  pill_shape: PillShape;
  pill_color: string;
  nafdac_no: string | null;
  manufacturer: string | null;
  check_result: DrugCheckResult | null;
  quantity_dispensed: number | null;
  created_at: string;
  status: PrescriptionStatus;
  source: PrescriptionSource;
  rejection_reason: string | null;
};
type Reminder = { prescription_id: string; time_of_day: string };
type Refill = { prescription_id: string; runs_out_on: string; quantity_dispensed: number; doses_per_day: number; units_per_dose: number };

/** My medicines: every active prescription with its times, supply left and registration check. */
export default async function MedsPage() {
  const { profile } = await requireRole(patientRoles);
  const t = tr("meds");
  const supabase = await createClient();
  const [{ data: meds }, { data: rems }, { data: refills }] = await Promise.all([
    supabase.from("prescriptions").select("id,drug_name,strength,dose,frequency_per_day,instructions_plain,pill_shape,pill_color,nafdac_no,manufacturer,check_result,quantity_dispensed,created_at,status,source,rejection_reason").neq("status", "rejected").eq("active", true).order("created_at", { ascending: false }),
    supabase.from("reminders").select("prescription_id,time_of_day").eq("active", true).order("time_of_day"),
    supabase.from("refills").select("prescription_id,runs_out_on,quantity_dispensed,doses_per_day,units_per_dose").eq("refilled", false),
  ]);
  const list = (meds ?? []) as Med[];
  const times = new Map<string, string[]>();
  for (const r of (rems ?? []) as Reminder[]) times.set(r.prescription_id, [...(times.get(r.prescription_id) ?? []), r.time_of_day.slice(0, 5)]);
  const supply = new Map(((refills ?? []) as Refill[]).map((r) => [r.prescription_id, r]));
  const today = lagosDate();
  const rate = Number(profile.speech_rate) || 1;
  const courses = await loadCourses(supabase, { patientId: profile.id }).catch((e) => {
    console.error("[course]", e);
    return [];
  });

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionLabel>{t("label")}</SectionLabel>
          <h1 className="mt-1 text-2xl">{t("title")}</h1>
        </div>
        <ButtonLink href="/add" variant="outline">
          <ScanIcon size={20} />
          {t("addAnother")}
        </ButtonLink>
      </div>

      {courses.length > 0 && (
        <section aria-labelledby="meds-courses" className="space-y-3">
          <SectionLabel as="h2">
            <span id="meds-courses">{t("coursesLabel")}</span>
          </SectionLabel>
          {courses.map((c) => (
            <CourseCard key={c.prescriptionId} course={c} rate={rate} allowStop />
          ))}
        </section>
      )}

      {list.length === 0 ? (
        <EmptyState label={t("label")} title={t("emptyTitle")} icon={<ScanIcon size={24} />} action={<ButtonLink href="/add">{t("addFirst")}</ButtonLink>}>
          <p>{t("emptyBody")}</p>
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {list.map((m) => {
            const refill = supply.get(m.id);
            const left = refill ? daysLeft(refill, today) : null;
            const totalDays = refill ? Math.max(1, Math.floor(refill.quantity_dispensed / (refill.doses_per_day * Number(refill.units_per_dose)))) : null;
            return (
              <li key={m.id}>
                <MedicineCard
                  name={m.drug_name}
                  strength={m.strength ?? ""}
                  time={(times.get(m.id) ?? []).join(" · ")}
                  dose={m.dose ?? ""}
                  pill={{ shape: m.pill_shape, color: m.pill_color }}
                  status={{ tone: left !== null && left <= 3 ? "warning" : "neutral", label: left === null ? t("perDay", { count: m.frequency_per_day }) : t("daysLeft", { count: Math.max(0, left) }) }}
                  footer={
                    <div className="space-y-3">
                      {m.instructions_plain && <ListenButton text={m.instructions_plain} rate={rate} />}
                      {refill && left !== null && totalDays && (
                        <Meter label={t("supply")} valueText={t("daysLeft", { count: Math.max(0, left) })} value={Math.max(0, left)} max={totalDays} tone={left <= 3 ? "warning" : "primary"} />
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip tone={m.status === "pending" ? "neutral" : "success"}>{t(`status.${m.status}`)}</StatusChip>
                        <span className="text-sm text-ink-2">{t(`source.${m.source}`)}</span>
                      </div>
                      {m.status === "pending" && <p className="text-sm text-ink-2">{t("pendingNote")}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <DrugCheckChip result={m.check_result} />
                        {m.nafdac_no && <span className="font-mono text-sm text-ink-2">{m.nafdac_no}</span>}
                        {m.manufacturer && <span className="text-sm text-ink-2">· {m.manufacturer}</span>}
                      </div>
                      {m.check_result && m.check_result !== "registered" && <DrugCheckNote result={m.check_result} typedName={m.drug_name} typedStrength={m.strength ?? ""} />}
                    </div>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
