import { strings } from "@/content/strings";
import { tr } from "@/lib/strings";
import { EmptyState } from "./EmptyState";
import { HospitalHeader } from "./HospitalHeader";
import { ButtonLink } from "./ui";

type PageKey = keyof typeof strings.pages;

/**
 * Stand-in for screens built in later stages: a finished-looking empty state inside the
 * real shell. All text comes from src/content/strings.ts. `shell="public"` adds the public header (app
 * groups get the header and navigation from their layout).
 */
export async function PlaceholderPage({ titleKey, shell }: { titleKey: PageKey; shell?: "public" }) {
  const t = tr();
  return (
    <>
      {shell === "public" && <HospitalHeader />}
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <EmptyState
          label={t("placeholder.label")}
          title={t(`pages.${titleKey}`)}
          action={
            <ButtonLink href="/" variant="outline">
              {t("placeholder.backHome")}
            </ButtonLink>
          }
        >
          <p>{t("placeholder.comingSoon")}</p>
        </EmptyState>
      </main>
    </>
  );
}
