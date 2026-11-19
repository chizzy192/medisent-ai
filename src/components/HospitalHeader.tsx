import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ReadAloudButton } from "./ReadAloudButton";

export type HeaderHospital = {
  name: string;
  brandColor?: string | null;
  logoUrl?: string | null;
};

/**
 * Section 3 header rule: cream-light background, cocoa "Medisent AI" wordmark
 * (Young Serif), chocolate hospital name, 3px bottom bar in the hospital's
 * brand_color (denim when there is no hospital or no colour).
 */
export async function HospitalHeader({ hospital }: { hospital?: HeaderHospital | null }) {
  const t = await getTranslations("header");
  const barColor = hospital?.brandColor || brand.defaultBrandColor;

  return (
    <header
      className="border-b-[3px] bg-cream-light"
      style={{ borderBottomColor: barColor }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label={t("homeLink")}
            className="flex min-h-12 items-center font-heading text-2xl text-cocoa"
          >
            {brand.name}
          </Link>
          {hospital && (
            <span className="min-w-0 border-l border-tan pl-3 font-bold text-chocolate">
              {hospital.name}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <ReadAloudButton />
        </div>
      </div>
    </header>
  );
}
