import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ReadAloudButton } from "@/components/ReadAloudButton";

/**
 * Landing top bar (BUILD_PLAN Stage 0, section 1): logo, section links, language picker,
 * "Sign in" (outline) and "Try the demo" (primary). The read-aloud button is on every screen.
 * Sticky at the top. Below 1024px the section links move to a second row that wraps
 * (always visible, no JS, 48px targets) and "Sign in" joins that row.
 */
export async function TopBar() {
  const t = await getTranslations("landing");
  const th = await getTranslations("header");
  const links = [
    { href: "#how-it-works", label: t("navHowItWorks") },
    { href: "#for-hospitals", label: t("navForHospitals") },
    { href: "#safety", label: t("navSafety") },
    { href: "#languages", label: t("navLanguages") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" aria-label={th("homeLink")} className="flex min-h-12 shrink-0 items-center">
          <Logo />
        </Link>
        <nav
          aria-label={t("navLabel")}
          className="max-lg:order-3 max-lg:-mx-4 max-lg:basis-full max-lg:border-t max-lg:border-border max-lg:px-3 sm:max-lg:-mx-6 sm:max-lg:px-5 lg:flex lg:flex-1 lg:justify-center"
        >
          <ul className="flex flex-wrap items-center gap-x-1 max-lg:py-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="flex min-h-12 items-center rounded-button px-3 text-sm font-medium whitespace-nowrap text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="lg:hidden">
              <Link
                href="/login"
                className="flex min-h-12 items-center rounded-button px-3 text-sm font-semibold whitespace-nowrap text-primary hover:bg-primary-tint"
              >
                {t("signIn")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          {/* Phones (< 768px): no read-aloud button in the bar (owner's choice); the header bar stays short. */}
          <div className="hidden md:flex">
            <ReadAloudButton />
          </div>
          <Link href="/login" className="btn-outline hidden px-4 text-sm lg:inline-flex">
            {t("signIn")}
          </Link>
          <Link href="/demo" className="btn-primary hidden px-4 text-sm sm:inline-flex">
            {t("tryDemo")}
          </Link>
        </div>
      </div>
    </header>
  );
}
