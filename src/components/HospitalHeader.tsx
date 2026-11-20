import Link from "next/link";
import { tr } from "@/lib/strings";
import { brand } from "@/config/brand";
import { Logo } from "./Logo";
import { ReadAloudButton } from "./ReadAloudButton";

export type HeaderHospital = {
  name: string;
  brandColor?: string | null;
  logoUrl?: string | null;
};

/**
 * Section 3 v2 header: white, logo left with the hospital name under it, read-aloud button
 * right, 3px bar at the bottom in the hospital's brand_color (#1D4E89 when it has
 * none). With no hospital yet (public screens) the bar is primary (BUILD_PLAN Stage 0).
 */
export async function HospitalHeader({ hospital }: { hospital?: HeaderHospital | null }) {
  const t = tr("header");
  const barColor = hospital ? hospital.brandColor || brand.defaultBrandColor : "var(--color-primary)";

  return (
    <header className="border-b-[3px] bg-surface" style={{ borderBottomColor: barColor }}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="min-w-0">
          <Link href="/" aria-label={t("homeLink")} className="flex min-h-12 items-center">
            <Logo />
          </Link>
          {hospital && (
            <p className="-mt-1 flex items-center gap-1.5 text-sm text-ink-2">
              {hospital.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- hospital logos come from Supabase Storage at any size
                <img src={hospital.logoUrl} alt="" className="size-5 rounded-sm object-contain" />
              )}
              <span className="[overflow-wrap:anywhere]">{hospital.name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ReadAloudButton />
        </div>
      </div>
    </header>
  );
}
