import { getFormatter, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/EmptyState";
import { ScanIcon } from "@/components/icons";
import { MedicineCard } from "@/components/MedicineCard";
import { StatusChip } from "@/components/StatusChip";
import { TodayRing } from "@/components/TodayRing";
import { ButtonLink, SectionLabel } from "@/components/ui";
import type { PillShape } from "@/components/PillIcon";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";

type Prescription = {
  id: string;
  drug_name: string;
  strength: string | null;
  dose: string | null;
  frequency_per_day: number;
  pill_shape: PillShape;
  pill_color: string;
};

/**
 * Patient home, Stage 1: "Welcome to [Hospital]" with the patient's medicines and conditions
 * read through RLS. Stage 2 adds the live Today ring and the day timeline.
 */
export default async function HomePage() {
  const { profile, hospital } = await requireRole(patientRoles);
  const t = await getTranslations("home");
  const format = await getFormatter();
  const supabase = await createClient();
  const today = format.dateTime(new Date(), { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });

  // Midnight in Lagos (UTC+1, no DST), whatever zone the server runs in.
  const lagos = new Date(new Date().getTime() + 60 * 60 * 1000);
  const start = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate(), -1));
  const [{ data: meds }, { data: conditions }, { data: logs }] = await Promise.all([
    supabase.from("prescriptions").select("id,drug_name,strength,dose,frequency_per_day,pill_shape,pill_color").eq("active", true).order("created_at"),
    supabase.from("conditions").select("id,name").order("name"),
    supabase.from("dose_logs").select("status").gte("scheduled_at", start.toISOString()),
  ]);
  const prescriptions = (meds ?? []) as Prescription[];
  const total = prescriptions.reduce((sum, p) => sum + p.frequency_per_day, 0);
  const taken = (logs ?? []).filter((l) => l.status === "taken" || l.status === "late").length;
  const firstName = profile.full_name.split(" ")[0];

  const times = (n: number) => (n === 1 ? ["08:00"] : n === 2 ? ["08:00", "20:00"] : ["08:00", "14:00", "20:00"]);

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-5">
      <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-4">
        <TodayRing taken={taken} total={total} caption={t("ringCaption")} label={t("ringLabel", { taken, total })} />
        <div className="min-w-0 flex-[1_1_10rem]">
          <SectionLabel>{today}</SectionLabel>
          <p className="mt-0.5 text-xl font-semibold">{t("greetingName", { name: firstName })}</p>
          <p className="text-base text-ink-2">{hospital ? t("welcomeHospital", { hospital: hospital.name }) : t("welcomeIndependent")}</p>
        </div>
      </section>

      {conditions && conditions.length > 0 && (
        <section aria-labelledby="conditions-title">
          <SectionLabel as="h2" className="mb-2">
            <span id="conditions-title">{t("conditions")}</span>
          </SectionLabel>
          <ul className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <li key={c.id}>
                <StatusChip tone="neutral">{c.name}</StatusChip>
              </li>
            ))}
          </ul>
        </section>
      )}

      {prescriptions.length === 0 ? (
        <EmptyState
          label={t("todayLabel")}
          title={t("emptyTitle")}
          icon={<ScanIcon size={24} />}
          action={
            <ButtonLink href="/scan" className="w-full sm:w-auto">
              <ScanIcon size={20} />
              {t("emptyAction")}
            </ButtonLink>
          }
        >
          <p>{t("emptyBody")}</p>
        </EmptyState>
      ) : (
        <section aria-labelledby="meds-title" className="space-y-3">
          <SectionLabel as="h2">
            <span id="meds-title">{t("medicines")}</span>
          </SectionLabel>
          {prescriptions.map((p) => (
            <MedicineCard
              key={p.id}
              name={p.drug_name}
              strength={p.strength ?? ""}
              time={times(p.frequency_per_day).join(" · ")}
              dose={p.dose ?? ""}
              pill={{ shape: p.pill_shape, color: p.pill_color }}
              status={{ tone: "neutral", label: t("perDay", { count: p.frequency_per_day }) }}
            />
          ))}
        </section>
      )}
    </main>
  );
}
