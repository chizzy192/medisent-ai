import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { brand, tagline } from "@/config/brand";
import { defaultLocale, isLocale, localeNames, locales } from "@/config/locales";
import { ClockIcon, PillIcon } from "@/components/icons";
import { SpeakTextButton } from "@/components/SpeakTextButton";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tHeader = await getTranslations("header");
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  return (
    <main id="main" className="flex-1">
      {/* Brand + actions, with a real example of what the patient will see. */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:pt-16 lg:pb-20">
        <div>
          <p lang="mul" className="font-heading text-xl text-chocolate sm:text-2xl">
            {brand.signature}
          </p>
          <h1 className="mt-2 font-heading text-5xl text-cocoa sm:text-[4.5rem] sm:leading-none">
            {brand.name}
          </h1>
          <p className="mt-4 font-heading text-2xl text-chocolate sm:text-3xl">
            {tagline[locale]}
          </p>
          <p className="mt-6 max-w-[34ch] text-lg text-espresso">{t("intro")}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/login" className="btn-primary sm:min-w-48">
              {t("signIn")}
            </Link>
            <Link href="/register-hospital" className="btn-primary sm:min-w-48">
              {t("registerHospital")}
            </Link>
          </div>
          <p className="mt-4 text-base text-mocha">{t("forHospitals")}</p>
        </div>

        {/* Example reminder: the dose and time are the most readable text. */}
        <figure className="rounded-card border border-sand bg-surface p-4 shadow-[0_1px_0_var(--color-sand)] sm:p-6">
          <figcaption className="text-base font-bold text-mocha">{t("exampleLabel")}</figcaption>
          <div className="mt-4 flex items-start gap-4">
            <span className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-cream text-caramel">
              <PillIcon size={28} />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-3xl text-chocolate">{t("exampleDrug")}</p>
              <p className="mt-1 text-xl font-bold text-espresso">{t("exampleInstruction")}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="inline-flex min-h-12 items-center gap-2 rounded-full bg-sand px-4 text-lg font-bold text-espresso">
              <ClockIcon className="text-chocolate" />
              <span>
                {t("exampleDue")} · {t("exampleTime")}
              </span>
            </p>
            <SpeakTextButton
              text={`${t("exampleDrug")}. ${t("exampleInstruction")}`}
              label={t("examplePlay")}
              stopLabel={tHeader("stopReading")}
            />
          </div>
        </figure>
      </section>

      <section className="border-y border-sand bg-cream">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-14">
          <div>
            <h2 className="text-2xl">{t("stepsTitle")}</h2>
            <ol className="mt-5 space-y-5">
              {(["step1", "step2", "step3"] as const).map((key, index) => (
                <li key={key} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-tan bg-surface font-heading text-xl text-cocoa"
                  >
                    {index + 1}
                  </span>
                  <p className="pt-1.5 text-lg">{t(key)}</p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-2xl">{t("languagesTitle")}</h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {locales.map((code) => (
                <li
                  key={code}
                  lang={code}
                  className="rounded-full border border-tan bg-surface px-4 py-2 text-lg font-bold text-chocolate"
                >
                  {localeNames[code]}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-base text-mocha">
              {t("letterCheck")}: <span lang="yo" className="font-bold text-espresso">ẹ ọ ṣ ị ụ ṅ</span>{" "}
              <span lang="yo" className="font-heading text-lg text-chocolate">ẹ ọ ṣ ị ụ ṅ</span>
            </p>
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="max-w-[60ch] text-base text-mocha">{t("safety")}</p>
      </footer>
    </main>
  );
}
