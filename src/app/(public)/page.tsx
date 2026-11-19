import Link from "next/link";
import type { ReactNode } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { brand, tagline } from "@/config/brand";
import { defaultLocale, isLocale, localeNames, locales } from "@/config/locales";
import { AlertIcon, ClockIcon, MessageIcon, MissedIcon, PhoneIcon } from "@/components/icons";
import { SpeakTextButton } from "@/components/SpeakTextButton";

/** A wall-clock time in Lagos, formatted for the visitor's locale. */
function lagosTime(hour: number) {
  return new Date(Date.UTC(2026, 0, 15, hour - 1, 0));
}

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const format = await getFormatter();
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const time = (hour: number) =>
    format.dateTime(lagosTime(hour), { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

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
        {/* Offer and actions in one column. The header already carries the wordmark. */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-6 pb-8 sm:px-6 sm:pt-10 sm:pb-10 lg:pt-14 lg:pb-12">
          <h1 className="max-w-[22ch] font-heading text-[2rem] leading-tight text-cocoa sm:text-5xl sm:leading-[1.1]">
            <span lang="mul">{brand.signature}</span> {tagline[locale]}
          </h1>
          <p className="mt-4 max-w-[48ch] text-lg sm:mt-5">{t("intro")}</p>
          <div className="mt-5 sm:mt-6">{actions("primary-action")}</div>
          <p className="mt-4 max-w-[52ch] text-base text-mocha">{t("verifiedNote")}</p>
        </section>

        {/* The day: each hour proves one claim, with the same caption-above-artifact device. */}
        <section aria-labelledby="day-title" className="border-t border-sand">
          <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-14 sm:px-6 sm:pt-10 lg:pt-12 lg:pb-20">
            <h2 id="day-title" className="text-3xl">
              {t("dayTitle")}
            </h2>
            <p className="mt-2 text-base text-mocha">{t("dayIntro")}</p>

            <ol className="relative mt-8 space-y-12 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-0.5 before:bg-tan lg:space-y-16">
              <Stop
                time={time(8)}
                status={<Status icon={<ClockIcon size={20} />} label={t("statusDue")} tone="due" />}
                caption={t("morningTitle")}
                note={
                  <>
                    {t("morningNote")}{" "}
                    <span className="font-bold text-espresso">
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
                <article className="rounded-card border border-sand bg-surface p-4 shadow-card sm:p-6">
                  <p className="font-heading text-3xl text-chocolate [overflow-wrap:anywhere]">{t("morningDrug")}</p>
                  <p className="mt-1 text-xl font-bold">{t("morningInstruction")}</p>
                  <div className="mt-5">
                    <SpeakTextButton
                      text={`${t("morningDrug")}. ${t("morningInstruction")}`}
                      label={t("play")}
                      stopLabel={t("stop")}
                    />
                  </div>
                </article>
              </Stop>

              <Stop
                time={time(14)}
                status={<Status icon={<MessageIcon size={20} />} label={t("statusSms")} tone="channel" />}
                caption={t("afternoonTitle")}
                note={t("afternoonNote")}
              >
                <BasicPhone heading={brand.name}>{t("afternoonSms")}</BasicPhone>
              </Stop>

              <Stop
                time={time(20)}
                status={<Status icon={<MissedIcon size={20} />} label={t("statusMissed")} tone="missed" />}
                caption={t("eveningTitle")}
                note={t("eveningNote")}
              >
                <BasicPhone heading={t("eveningTo")}>{t("eveningSms", { time: time(20) })}</BasicPhone>
              </Stop>

              <Stop
                time={t("anyTime")}
                wordTime
                status={<Status icon={<AlertIcon size={20} />} label={t("statusUrgent")} tone="urgent" />}
                caption={t("urgentTitle")}
                note={t("urgentNote")}
              >
                <div className="rounded-card border border-sand bg-surface p-4 shadow-card sm:p-6">
                  <blockquote className="font-heading text-2xl text-chocolate">{t("urgentQuote")}</blockquote>
                  <div className="mt-4 rounded-button bg-denim-tint p-4">
                    <p className="text-lg font-bold">{t("urgentReply")}</p>
                    {/* Part of the illustrated reply, drawn as the in-app call control it depicts. */}
                    <p className="mt-3 inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-denim px-4 py-1 font-bold text-denim">
                      <PhoneIcon size={20} />
                      {t("urgentCall")}
                    </p>
                  </div>
                </div>
              </Stop>
            </ol>
          </div>
        </section>

        {/* Close: how you join, and the actions again. */}
        <section aria-labelledby="join-title" className="border-t border-sand bg-cream">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:py-16">
            <div>
              <h2 id="join-title" className="text-3xl">
                {t("joinTitle")}
              </h2>
              <ol className="mt-6 space-y-5">
                {(["step1", "step2", "step3"] as const).map((key, index) => (
                  <li key={key} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-tan bg-surface font-heading text-xl text-cocoa"
                    >
                      {index + 1}
                    </span>
                    <p className="max-w-[52ch] pt-1.5 text-lg">{t(key)}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="lg:pt-14">
              {actions()}
              <p className="mt-6 max-w-[46ch] text-base text-mocha">{t("safety")}</p>
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
      <p className="text-sm text-mocha">
        {label}: <span lang="yo">ẹ ọ ṣ ị ụ ṅ</span> · <span lang="yo" className="font-heading">ẹ ọ ṣ ị ụ ṅ</span>
      </p>
    </footer>
  );
}

/** One hour on the day-rail: dot, big serif time, status; then caption, proof and note. */
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
  status: ReactNode;
  caption: string;
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="relative pl-10 lg:grid lg:grid-cols-[13rem_minmax(0,32rem)_minmax(0,1fr)] lg:gap-x-10">
      <span
        aria-hidden="true"
        className="absolute top-2.5 left-0 size-6 rounded-full border-4 border-cream-light bg-caramel"
      />
      <h3 className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-col lg:items-start">
        <span className={`font-heading text-chocolate ${wordTime ? "text-3xl" : "text-4xl"}`}>{time}</span>
        {status}
      </h3>
      <figure className="mt-4 min-w-0 lg:mt-1">
        <figcaption className="mb-3 text-lg font-bold text-chocolate">{caption}</figcaption>
        {children}
      </figure>
      <p className="mt-4 max-w-[40ch] text-lg lg:mt-10">{note}</p>
    </li>
  );
}

function Status({
  icon,
  label,
  tone,
}: {
  icon: ReactNode;
  label: string;
  tone: "due" | "missed" | "urgent" | "channel";
}) {
  const toneClass = {
    due: "bg-sand text-espresso",
    missed: "bg-ochre text-[#2A1B12]",
    urgent: "bg-chocolate text-cream-light",
    channel: "border border-dashed border-mocha text-chocolate",
  }[tone];
  return (
    <span className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-body text-base font-bold ${toneClass}`}>
      {icon}
      {label}
    </span>
  );
}

/**
 * A basic (feature) phone's SMS screen: a small cream LCD in a thin cocoa bezel,
 * with a keypad hint. Fixed colours: it depicts a device, not a themed surface.
 */
function BasicPhone({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-[19rem] rounded-[1.25rem] border-2 border-[#6F4A2E] bg-[#EAD9C2] p-2.5 shadow-card">
      <div className="rounded-sm bg-[#F5EDE0] p-3.5 text-[#2A1B12]">
        <p className="flex items-center gap-2 border-b border-[#CDB497] pb-2 text-base font-bold">
          <MessageIcon size={20} />
          {heading}
        </p>
        <p className="mt-2 text-lg leading-snug">{children}</p>
      </div>
      <div aria-hidden="true" className="mx-auto mt-2.5 grid w-28 grid-cols-3 gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-2 rounded-full bg-[#CDB497]" />
        ))}
      </div>
    </div>
  );
}
