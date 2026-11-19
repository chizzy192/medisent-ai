import { getFormatter, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/EmptyState";
import { ScanIcon } from "@/components/icons";
import { TodayRing } from "@/components/TodayRing";
import { ButtonLink, SectionLabel } from "@/components/ui";

/**
 * Patient home, first run (no medicines yet). Stage 2 replaces the empty state with the
 * Today ring hero card and the day timeline (signature elements 1 and 2).
 */
export default async function HomePage() {
  const t = await getTranslations("home");
  const format = await getFormatter();
  const today = format.dateTime(new Date(), { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-5">
      <section className="dot-grid flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-4">
        <TodayRing taken={0} total={0} caption={t("ringCaption")} label={t("ringLabel")} />
        <div className="min-w-0 flex-[1_1_10rem]">
          {/* ink-2 on the dot grid: ink-3 falls under 4.5:1 through the dots. */}
          <SectionLabel className="text-ink-2">{today}</SectionLabel>
          <p className="mt-0.5 text-xl font-semibold">{t("greeting")}</p>
          <p className="text-base text-ink-2">{t("noDoses")}</p>
        </div>
      </section>

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
    </main>
  );
}
