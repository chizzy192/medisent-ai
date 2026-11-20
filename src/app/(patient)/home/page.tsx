import Link from "next/link";
import { tr, formatDate } from "@/lib/strings";
import { DayTimeline } from "@/components/DayTimeline";
import { DoseCard, type DoseItem } from "@/components/DoseCard";
import { EmptyState } from "@/components/EmptyState";
import { ScanIcon } from "@/components/icons";
import type { PillShape } from "@/components/PillIcon";
import { RefillBanner, type RefillItem } from "@/components/RefillBanner";
import { StatusChip } from "@/components/StatusChip";
import { TodayRing } from "@/components/TodayRing";
import { CourseCard } from "@/components/CourseCard";
import { loadCourses } from "@/lib/course";
import { ButtonLink, SectionLabel } from "@/components/ui";
import { patientRoles, requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/db/server";
import type { PrescriptionStatus } from "@/lib/db/types";
import { daysLeft, doseState, lagosDate, lagosDayStart, lagosInstant, timeLabel } from "@/lib/reminders";

type Prescription = { id: string; drug_name: string; strength: string | null; dose: string | null; instructions_plain: string | null; pill_shape: PillShape; pill_color: string; active: boolean; duration_days: number | null; started_on: string; quantity_dispensed: number | null; status: PrescriptionStatus };
type Reviewed = { id: string; drug_name: string; strength: string | null; status: PrescriptionStatus; rejection_reason: string | null; verified_at: string };
type Reminder = { id: string; prescription_id: string; time_of_day: string; active: boolean };
type Log = { reminder_id: string; scheduled_at: string; status: string; snoozed_until: string | null };
type Refill = { prescription_id: string; runs_out_on: string; refilled: boolean };

/**
 * Patient home (signature elements 1 and 2): Today ring with the greeting and the next dose,
 * refill banner when a medicine is nearly out, then the day timeline with one card per dose.
 */
export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const { profile, hospital } = await requireRole(patientRoles);
  const params = await searchParams;
  const t = tr("home");
  const supabase = await createClient();
  const now = new Date();
  const today = lagosDate(now);
  const dayStart = lagosDayStart(now);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [{ data: meds }, { data: rems }, { data: logs }, { data: refills }, { data: conditions }, { data: reviewed }] = await Promise.all([
    supabase.from("prescriptions").select("id,drug_name,strength,dose,instructions_plain,pill_shape,pill_color,active,duration_days,started_on,quantity_dispensed,status").eq("active", true).neq("status", "rejected"),
    supabase.from("reminders").select("id,prescription_id,time_of_day,active").eq("active", true),
    supabase.from("dose_logs").select("reminder_id,scheduled_at,status,snoozed_until").gte("scheduled_at", dayStart.toISOString()).lt("scheduled_at", dayEnd.toISOString()),
    supabase.from("refills").select("prescription_id,runs_out_on,refilled").eq("refilled", false),
    supabase.from("conditions").select("id,name").order("name"),
    supabase.from("prescriptions").select("id,drug_name,strength,status,rejection_reason,verified_at").eq("source", "self").neq("status", "pending").gte("verified_at", weekAgo).order("verified_at", { ascending: false }),
  ]);
  const reviews = (reviewed ?? []) as Reviewed[];
  const courses = await loadCourses(supabase, { patientId: profile.id }).catch((e) => {
    console.error("[course]", e);
    return [];
  });
  const prescriptions = new Map(((meds ?? []) as Prescription[]).map((p) => [p.id, p]));
  const logByKey = new Map(((logs ?? []) as Log[]).map((l) => [`${l.reminder_id}|${new Date(l.scheduled_at).getTime()}`, l]));
  const supply = new Map<string, number>();
  for (const r of (refills ?? []) as Refill[]) supply.set(r.prescription_id, daysLeft(r, today));

  const items: DoseItem[] = ((rems ?? []) as Reminder[])
    .filter((r) => prescriptions.has(r.prescription_id))
    .map((r) => {
      const p = prescriptions.get(r.prescription_id)!;
      const at = lagosInstant(today, r.time_of_day.slice(0, 5));
      const log = logByKey.get(`${r.id}|${at.getTime()}`) ?? null;
      return {
        reminderId: r.id,
        prescriptionId: p.id,
        scheduledAt: at.toISOString(),
        time: timeLabel(at),
        name: p.drug_name,
        strength: p.strength ?? "",
        dose: p.dose ?? "",
        instruction: p.instructions_plain ?? "",
        pill: { shape: p.pill_shape, color: p.pill_color },
        state: doseState(at, log, now),
        daysLeft: supply.get(p.id) ?? null,
        pending: p.status === "pending",
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const total = items.length;
  const taken = items.filter((i) => i.state === "taken").length;
  const next = items.find((i) => i.state === "now" || i.state === "snoozed") ?? items.find((i) => i.state === "later") ?? items.find((i) => i.state === "late");
  // Fixed courses are finished, not refilled: no banner for them.
  const courseDone = (p: Prescription) => p.duration_days !== null;
  const refillItems: RefillItem[] = [...prescriptions.values()]
    .filter((p) => supply.has(p.id) && supply.get(p.id)! <= 3 && !courseDone(p))
    .map((p) => ({ prescriptionId: p.id, name: p.drug_name, strength: p.strength, daysLeft: supply.get(p.id)!, quantity: p.quantity_dispensed, pill: { shape: p.pill_shape, color: p.pill_color } }));
  const firstName = profile.full_name.split(" ")[0];
  const rate = Number(profile.speech_rate) || 1;
  const dateLabel = formatDate(now, { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-5">
      {typeof params.saved === "string" && (
        <div role="status" className="rounded-button bg-success-tint p-3 text-base text-success">
          {t("savedNotice")}
        </div>
      )}
      {typeof params.added === "string" && (
        <div role="status" className="rounded-button bg-primary-tint p-3 text-base text-primary" data-testid="added-notice">
          {t("addedNotice")}
          {typeof params.interaction === "string" && <span className="mt-1 block font-medium">{t("interactionNotice")}</span>}
        </div>
      )}
      {courses.length > 0 && (
        <section aria-labelledby="courses-title" className="space-y-3">
          <SectionLabel as="h2">
            <span id="courses-title">{t("coursesLabel")}</span>
          </SectionLabel>
          {courses.map((c) => (
            <CourseCard key={c.prescriptionId} course={c} rate={rate} />
          ))}
        </section>
      )}
      {reviews.length > 0 && (
        <section aria-labelledby="reviews-title" className="space-y-2">
          <SectionLabel as="h2">
            <span id="reviews-title">{t("reviewsLabel")}</span>
          </SectionLabel>
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className={`rounded-button p-3 text-base ${r.status === "rejected" ? "bg-warning-tint text-warning" : "bg-success-tint text-success"}`} data-testid="review-notice">
                <span className="font-semibold">
                  {r.drug_name} {r.strength}
                </span>
                : {t(`review.${r.status}`)}
                {r.status === "rejected" && r.rejection_reason ? ` ${t("reviewReason", { reason: r.rejection_reason })}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-4">
        <TodayRing taken={taken} total={total} caption={t("ringCaption")} label={t("ringLabel", { taken, total })} />
        <div className="min-w-0 flex-[1_1_10rem]">
          <SectionLabel>{dateLabel}</SectionLabel>
          <h1 className="mt-0.5 text-xl font-semibold">{t("greetingName", { name: firstName })}</h1>
          {next ? (
            <p className="text-base text-ink-2">
              {t("next")}: <span className="font-medium text-ink">{next.name}</span>{" "}
              <span className="font-mono">
                {next.time} · {next.dose}
              </span>
            </p>
          ) : (
            <p className="text-base text-ink-2">{total ? t("allDone") : hospital ? t("welcomeHospital", { hospital: hospital.name }) : t("welcomeIndependent")}</p>
          )}
        </div>
      </section>

      {refillItems.length > 0 && <RefillBanner items={refillItems} />}

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

      {total === 0 ? (
        <EmptyState
          label={t("todayLabel")}
          title={t("emptyTitle")}
          icon={<ScanIcon size={24} />}
          action={
            <ButtonLink href="/add" className="w-full sm:w-auto">
              <ScanIcon size={20} />
              {t("emptyAction")}
            </ButtonLink>
          }
        >
          <p>{t("emptyBody")}</p>
        </EmptyState>
      ) : (
        <section aria-labelledby="today-title" className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel as="h2">
              <span id="today-title">{t("todayLabel")}</span>
            </SectionLabel>
            <Link href="/meds" className="text-base font-medium text-primary underline">
              {t("allMedicines")}
            </Link>
          </div>
          <DayTimeline items={items.map((item) => ({ key: item.reminderId, state: item.state, card: <DoseCard item={item} rate={rate} /> }))} />
        </section>
      )}
    </main>
  );
}
