import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type en from "../../messages/en.json";

type PageKey = keyof (typeof en)["pages"];

/** Stand-in for screens built in later stages. All text comes from messages/. */
export async function PlaceholderPage({ titleKey }: { titleKey: PageKey }) {
  const t = await getTranslations();
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl">{t(`pages.${titleKey}`)}</h1>
      <p className="mt-4 text-lg">{t("placeholder.comingSoon")}</p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center font-semibold text-primary underline underline-offset-4">
        {t("placeholder.backHome")}
      </Link>
    </main>
  );
}
