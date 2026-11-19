import Link from "next/link";
import type { ReactNode } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { FeaturePhone } from "@/components/landing/FeaturePhone";
import { PreviewConsole } from "@/components/landing/PreviewConsole";
import { TopBar } from "@/components/landing/TopBar";
import { AlertIcon, ArrowRightIcon, LockIcon, ShieldIcon, VerifiedListIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { StatusChip } from "@/components/StatusChip";
import { previewLabel } from "@/config/landingPreview";
import { defaultLocale, isLocale, localeCodes, locales } from "@/config/locales";

/** A wall-clock time in Lagos, formatted for the visitor's locale as 24-hour (`08:00`). */
function lagosTime(hour: number) {
  return new Date(Date.UTC(2026, 0, 15, hour - 1, 0));
}

/**
 * Landing page: the nine sections of BUILD_PLAN Stage 0, drawn to docs/mockups/medisent-landing.png.
 * The brand name appears in the top bar only. The top bar carries the read-aloud button.
 */
export default async function LandingPage() {
  const t = await getTranslations("landing");
  const format = await getFormatter();
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const reminderTime = format.dateTime(lagosTime(previewLabel.reminderHour), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Africa/Lagos",
  });

  const steps = [
    { n: "01", title: t("step1Title"), body: t("step1Body") },
    { n: "02", title: t("step2Title"), body: t("step2Body") },
    { n: "03", title: t("step3Title"), body: t("step3Body") },
    { n: "04", title: t("step4Title"), body: t("step4Body") },
  ];

  const columns = [
    {
      who: t("viewsPatients"),
      sees: t("viewsPatientsSees"),
      does: t("viewsPatientsDoes"),
      verified: t("viewsPatientsVerified"),
    },
    { who: t("viewsStaff"), sees: t("viewsStaffSees"), does: t("viewsStaffDoes"), verified: t("viewsStaffVerified") },
    {
      who: t("viewsHospitals"),
      sees: t("viewsHospitalsSees"),
      does: t("viewsHospitalsDoes"),
      verified: t("viewsHospitalsVerified"),
    },
  ];

  const safety = [
    { icon: <ShieldIcon size={22} />, title: t("safe1Title"), body: t("safe1Body") },
    { icon: <AlertIcon size={22} />, title: t("safe2Title"), body: t("safe2Body") },
    { icon: <LockIcon size={22} />, title: t("safe3Title"), body: t("safe3Body") },
    { icon: <VerifiedListIcon size={22} />, title: t("safe4Title"), body: t("safe4Body") },
  ];

  return (
    <>
      <TopBar />
      <main id="main" className="flex-1">
        {/* 2 · Hero on the dot grid, then 3 · the live preview console. */}
        <section className="dot-grid border-b border-border">
          <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14 lg:pt-16 lg:pb-16">
            <p className="inline-flex min-h-8 items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5 font-mono text-label tracking-[0.04em] text-primary uppercase">
              <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
              {t("kicker")}
            </p>
            <h1 className="mt-5 max-w-[30ch] text-3xl tracking-[-0.02em] sm:text-4xl lg:text-display">
              {t("headlineBefore")}
              <span className="text-primary">{t("headlineAccent")}</span>
              {t("headlineAfter")}
            </h1>
            <p className="mt-5 max-w-[56ch] text-lg text-ink-2">{t("lead")}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/demo" className="btn-primary">
                {t("tryDemo")}
                <ArrowRightIcon size={20} />
              </Link>
              <Link href="/register-hospital" className="btn-outline">
                {t("registerHospital")}
              </Link>
            </div>
            <div className="mt-10 lg:mt-12">
              {/* English visitors see the Igbo sentence with its gloss first, as in the comp. */}
              <PreviewConsole initial={locale === "en" ? "ig" : locale} time={reminderTime} />
            </div>
          </div>
        </section>

        {/* 4 · How it works: four numbered steps on a connecting line. */}
        <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-32 lg:scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <SectionHead id="how-title" title={t("howTitle")} intro={t("howIntro")} />
            <ol className="relative mt-10 grid gap-8 before:absolute before:bg-border max-lg:before:top-3 max-lg:before:bottom-3 max-lg:before:left-5 max-lg:before:w-px lg:grid-cols-4 lg:gap-6 lg:before:top-5 lg:before:right-0 lg:before:left-0 lg:before:h-px">
              {steps.map((step) => (
                <li key={step.n} className="relative flex gap-4 max-lg:pl-0 lg:block">
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-button border border-primary bg-surface font-mono text-sm font-medium text-primary"
                  >
                    {step.n}
                  </span>
                  <div className="lg:mt-5">
                    <h3 className="text-lg">
                      <span className="sr-only">{step.n} </span>
                      {step.title}
                    </h3>
                    <p className="mt-1 max-w-[36ch] text-base text-ink-2">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5 · One platform, three views: spec-sheet table; three cards on phones. */}
        <section id="for-hospitals" aria-labelledby="views-title" className="scroll-mt-32 lg:scroll-mt-20 border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <SectionHead id="views-title" title={t("viewsTitle")} intro={t("viewsIntro")} />
            <div className="mt-8 overflow-hidden rounded-card border border-border bg-surface max-md:hidden">
              <table className="w-full border-collapse text-left text-base">
                <thead>
                  <tr className="border-b border-border bg-bg">
                    <th scope="col" className="label-mono w-32 px-4 py-3 font-medium">
                      {t("viewsWho")}
                    </th>
                    {columns.map((column) => (
                      <th key={column.who} scope="col" className="px-4 py-3 font-semibold text-ink">
                        {column.who}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-surface-2 align-top">
                    <th scope="row" className="label-mono px-4 py-4 font-medium">
                      {t("viewsSees")}
                    </th>
                    {columns.map((column) => (
                      <td key={column.who} className="px-4 py-4 text-ink-2">
                        {column.sees}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-surface-2 align-top">
                    <th scope="row" className="label-mono px-4 py-4 font-medium">
                      {t("viewsDoes")}
                    </th>
                    {columns.map((column) => (
                      <td key={column.who} className="px-4 py-4 text-ink-2">
                        {column.does}
                      </td>
                    ))}
                  </tr>
                  <tr className="align-top">
                    <th scope="row" className="label-mono px-4 py-4 font-medium">
                      {t("viewsVerifiedBy")}
                    </th>
                    {columns.map((column) => (
                      <td key={column.who} className="px-4 py-4 font-mono text-sm text-ink">
                        {column.verified}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="mt-8 grid gap-4 md:hidden">
              {columns.map((column) => (
                <li key={column.who} className="rounded-card border border-border bg-surface p-4">
                  <h3 className="text-lg">{column.who}</h3>
                  <dl className="mt-3 space-y-3">
                    <div>
                      <dt className="label-mono">{t("viewsSees")}</dt>
                      <dd className="mt-0.5 text-base text-ink-2">{column.sees}</dd>
                    </div>
                    <div>
                      <dt className="label-mono">{t("viewsDoes")}</dt>
                      <dd className="mt-0.5 text-base text-ink-2">{column.does}</dd>
                    </div>
                    <div>
                      <dt className="label-mono">{t("viewsVerifiedBy")}</dt>
                      <dd className="mt-0.5 font-mono text-sm">{column.verified}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6 · Works on any phone. */}
        <section aria-labelledby="phone-title" className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
            <div className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6">
              <p className="label-mono">{t("phoneLabel")}</p>
              <h2 id="phone-title" className="mt-2 max-w-[20ch] text-2xl">
                {t("phoneTitle")}
              </h2>
              <p className="mt-3 max-w-[48ch] text-base text-ink-2">{t("phoneBody")}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                <li>
                  <StatusChip tone="neutral">{t("phoneChipOffline")}</StatusChip>
                </li>
                <li>
                  <StatusChip tone="neutral">{t("phoneChipSms")}</StatusChip>
                </li>
                <li>
                  <StatusChip tone="neutral">{t("phoneChipVoice")}</StatusChip>
                </li>
              </ul>
            </div>
            <div className="flex min-w-0 items-center justify-center rounded-card border border-border bg-surface p-6 sm:p-8">
              <FeaturePhone sms={t("phoneSms")} reply={t("phoneReply")} figureLabel={t("phoneFigure")} />
            </div>
          </div>
        </section>

        {/* 7 · Safe by design. */}
        <section id="safety" aria-labelledby="safe-title" className="scroll-mt-32 lg:scroll-mt-20 border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <SectionHead id="safe-title" title={t("safeTitle")} intro={t("safeIntro")} />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {safety.map((item) => (
                <li key={item.title} className="rounded-card border border-border bg-surface p-5">
                  <span
                    aria-hidden="true"
                    className="flex size-10 items-center justify-center rounded-button bg-primary-tint text-primary"
                  >
                    {item.icon}
                  </span>
                  <h3 className="mt-4 text-lg">{item.title}</h3>
                  <p className="mt-1 text-base text-ink-2">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 8 · Final CTA band on the dark palette (tokens remapped by .theme-dark). */}
        <section aria-labelledby="cta-title" className="px-4 pb-14 sm:px-6 lg:pb-20">
          <div className="theme-dark mx-auto w-full max-w-6xl rounded-card border border-border bg-surface px-5 py-8 text-ink sm:px-8 sm:py-10 lg:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="label-mono">{t("ctaLabel")}</p>
                <h2 id="cta-title" className="mt-2 text-2xl sm:text-3xl">
                  {t("ctaTitle")}
                </h2>
                <p className="mt-2 text-base text-ink-2">{t("ctaBody")}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:shrink-0">
                <Link href="/demo" className="btn-primary">
                  {t("tryDemo")}
                  <ArrowRightIcon size={20} />
                </Link>
                <Link href="/register-hospital" className="btn-outline bg-transparent text-ink">
                  {t("registerHospital")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 9 · Footer. */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 sm:px-6">
          <p className="flex items-center">
            <Logo />
          </p>
          <p className="font-mono text-sm text-ink-2">
            <span className="sr-only">{t("footerLanguages")}: </span>
            {locales.map((code) => localeCodes[code]).join(" · ")}
          </p>
        </div>
        {process.env.NODE_ENV !== "production" && <DevLetterCheck label={t("letterCheck")} />}
      </footer>
    </>
  );
}

/** Section heading with its one-line intro beside it on desktop (as in the mockup). */
function SectionHead({ id, title, intro }: { id: string; title: string; intro: ReactNode }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-10">
      <h2 id={id} className="max-w-[24ch] text-2xl sm:text-3xl">
        {title}
      </h2>
      <p className="max-w-[48ch] text-base text-ink-2">{intro}</p>
    </div>
  );
}

/**
 * Development-only glyph check (BUILD_PLAN Stage 0). Outside <main> so read-aloud skips it.
 * TODO (Stage 6): remove, see docs/stage-6-tasks.md.
 */
function DevLetterCheck({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
      <p className="text-sm text-ink-3">
        {label}: <span lang="yo">ẹ ọ ṣ ị ụ ṅ</span> · <span lang="yo" className="font-mono">ẹ ọ ṣ ị ụ ṅ</span>
      </p>
    </div>
  );
}
