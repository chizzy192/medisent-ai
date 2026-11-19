import Link from "next/link";
import type { ReactNode } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { brand, tagline } from "@/config/brand";
import { defaultLocale, isLocale, localeNames, locales } from "@/config/locales";
import { MessageIcon, PhoneIcon } from "@/components/icons";
import { SpeakTextButton } from "@/components/SpeakTextButton";
import { StatusChip, type ChipTone } from "@/components/StatusChip";

/** A wall-clock time in Lagos, formatted for the visitor's locale as 24-hour (`08:00`). */
function lagosTime(hour: number) {
  return new Date(Date.UTC(2026, 0, 15, hour - 1, 0));
}

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const format = await getFormatter();
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const time = (hour: number) =>
    format.dateTime(lagosTime(hour), {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Africa/Lagos",
    });

  // The visitor's own language first, then the rest.
  const languageList = [locale, ...locales.filter((code) => code !== locale)];

  const actions = (id?: string) => (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link id={id} href="/login" className="btn-primary sm:min-w-44">
        {t("signIn")}
      </Link>
      <Link href="/register-hospital" className="btn-primary sm:min-w-44">
        {t("registerHospital")}
      </Link>
    </div>
  );

  return (
    <>
      <main id="main" className="flex-1">
        {/* Offer and actions in one column. The header carries the logo. */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-7 pb-8 sm:px-6 sm:pt-10 sm:pb-10 lg:pt-14 lg:pb-12">
          <h1 className="max-w-[24ch] text-3xl tracking-[-0.01em] sm:text-4xl">
            <span lang="mul">{brand.signature}</span> {tagline[locale]}
          </h1>
          <p className="mt-4 max-w-[52ch] text-lg text-ink-2 sm:mt-5">{t("intro")}</p>
          <div className="mt-6">{actions("primary-action")}</div>
          <p className="mt-4 flex max-w-[60ch] items-start gap-2 text-sm text-ink-2">
            <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-success" />
            {t("verifiedNote")}
          </p>
        </section>

        {/* The day: each hour proves one claim, drawn in the app's own components. */}
        <section aria-labelledby="day-title" className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-14 sm:px-6 sm:pt-10 lg:pt-12 lg:pb-20">
            <h2 id="day-title" className="text-2xl">
              {t("dayTitle")}
            </h2>
            <p className="mt-1 text-sm text-ink-2">{t("dayIntro")}</p>

            <ol className="relative mt-8 space-y-10 before:absolute before:top-3 before:bottom-3 before:left-[7px] before:w-px before:bg-border lg:space-y-14">
              <Stop
                time={time(8)}
                status={{ tone: "primary", label: t("statusDueNow") }}
                caption={t("morningTitle")}
                note={
                  <>
                    {t("morningNote")}{" "}
                    <span className="font-medium text-ink">
                      {languageList.map((code, i) => (
                        <span key={code} lang={code}>
                          {localeNames[code]}
                          {i < languageList.length - 1 && " ·"}{" "}
                        </span>
                      ))}
                    </span>
                  </>
                }
              >
                <article className="rounded-card border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-card-title font-semibold [overflow-wrap:anywhere]">{t("morningDrug")}</p>
                      <p className="text-base text-ink-2">{t("morningDose")}</p>
                    </div>
                    <p className="font-mono text-time">{time(8)}</p>
                  </div>
                  <div className="mt-4 border-t border-surface-2 pt-3">
                    <SpeakTextButton
                      text={`${t("morningDrug")}. ${t("morningDose")}. ${time(8)}.`}
                      label={t("listenIn", { language: localeNames[locale] })}
                      stopLabel={t("stop")}
                    />
                  </div>
                </article>
              </Stop>

              <Stop
                time={time(14)}
                status={{ tone: "neutral", label: t("statusSms") }}
                caption={t("afternoonTitle")}
                note={t("afternoonNote")}
              >
                <SmsCard heading={brand.name}>
                  {t("afternoonSms")}
                </SmsCard>
              </Stop>

              <Stop
                time={time(20)}
                status={{ tone: "warning", label: t("statusMissed") }}
                caption={t("eveningTitle")}
                note={t("eveningNote")}
              >
                <SmsCard heading={t("eveningTo")}>
                  {t("eveningSms", { time: time(20) })}
                </SmsCard>
              </Stop>

              <Stop
                time={t("anyTime")}
                wordTime
                status={{ tone: "danger", label: t("statusUrgent") }}
                caption={t("urgentTitle")}
                note={t("urgentNote")}
              >
                {/* The real red-flag alert treatment (section 3 v2: red only for red flags). */}
                <div className="rounded-card bg-danger-solid p-4 text-on-danger">
                  <p className="font-mono text-label tracking-[0.04em] uppercase">
                    {t("alertLabel")} · {t("exampleLabel")}
                  </p>
                  <p className="mt-1 text-xl font-semibold">{t("urgentHeading")}</p>
                  <p className="mt-1 text-base">{t("urgentBody")}</p>
                  <p className="mt-3 flex items-center gap-2 text-base font-semibold">
                    <PhoneIcon size={20} />
                    {t("urgentCall")}
                  </p>
                </div>
              </Stop>
            </ol>
          </div>
        </section>

        {/* Close: how you join, and the actions again. */}
        <section aria-labelledby="join-title" className="border-t border-border bg-surface">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:py-16">
            <div>
              <h2 id="join-title" className="text-2xl">
                {t("joinTitle")}
              </h2>
              <ol className="mt-6 space-y-5">
                {(["step1", "step2", "step3"] as const).map((key, index) => (
                  <li key={key} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-button border border-border bg-bg font-mono text-sm text-primary"
                    >
                      {index + 1}
                    </span>
                    <p className="max-w-[52ch] pt-1 text-base">{t(key)}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="lg:pt-12">
              {actions()}
              <p className="mt-6 max-w-[46ch] text-sm text-ink-2">{t("safety")}</p>
            </div>
          </div>
        </section>
      </main>
      {process.env.NODE_ENV !== "production" && <DevLetterCheck label={t("letterCheck")} />}
    </>
  );
}

/**
 * Development-only glyph check (BUILD_PLAN Stage 0). Outside <main> so read-aloud skips it.
 * TODO (Stage 6): remove, see docs/stage-6-tasks.md.
 */
function DevLetterCheck({ label }: { label: string }) {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
      <p className="text-sm text-ink-3">
        {label}: <span lang="yo">ẹ ọ ṣ ị ụ ṅ</span> · <span lang="yo" className="font-mono">ẹ ọ ṣ ị ụ ṅ</span>
      </p>
    </footer>
  );
}

/** One hour on the day-rail: dot, mono time, status chip; then caption, proof and note. */
function Stop({
  time,
  wordTime = false,
  status,
  caption,
  note,
  children,
}: {
  time: string;
  wordTime?: boolean;
  status: { tone: ChipTone; label: string };
  caption: string;
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="relative pl-8 lg:grid lg:grid-cols-[11rem_minmax(0,30rem)_minmax(0,1fr)] lg:gap-x-10">
      <span
        aria-hidden="true"
        className="absolute top-2 left-0 size-[15px] rounded-full border-[3px] border-bg bg-primary"
      />
      <h3 className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-col lg:items-start">
        <span className={wordTime ? "text-xl font-semibold" : "font-mono text-3xl font-medium"}>{time}</span>
        <StatusChip tone={status.tone}>{status.label}</StatusChip>
      </h3>
      <figure className="mt-4 min-w-0 lg:mt-1">
        <figcaption className="label-mono mb-2">{caption}</figcaption>
        {children}
      </figure>
      <p className="mt-4 max-w-[42ch] text-base text-ink-2 lg:mt-7">{note}</p>
    </li>
  );
}

/** An SMS as received on a basic phone: plain bordered card, mono header line. */
function SmsCard({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="max-w-[24rem] rounded-card border border-border bg-surface p-4">
      <p className="flex min-w-0 items-center gap-2 border-b border-surface-2 pb-2 text-sm font-medium text-ink-2">
        <MessageIcon size={18} className="shrink-0 text-ink-3" />
        {heading}
      </p>
      <p className="mt-2 text-base">{children}</p>
    </div>
  );
}
