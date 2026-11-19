import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { htmlLang, isLocale, defaultLocale } from "@/config/locales";
import "./globals.css";

// Section 3 v2: IBM Plex Sans (UI) + IBM Plex Mono (times, doses, IDs, labels).
// The "vietnamese" subset carries ẹ ọ ị ụ; unicode-range downloads only what is used.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: "500",
  display: "swap",
});

// Fallback for stacked tone marks (e.g. ẹ̀) that Plex lacks.
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: brand.name, template: `%s · ${brand.name}` },
    description: t("description"),
    applicationName: brand.name,
    manifest: "/manifest.json",
    metadataBase: new URL(brand.appUrl),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#111A2B" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const lang = htmlLang[isLocale(locale) ? locale : defaultLocale];

  return (
    <html
      lang={lang}
      className={`${plexSans.variable} ${plexMono.variable} ${notoSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
