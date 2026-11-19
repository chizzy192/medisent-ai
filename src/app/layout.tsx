import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Noto_Sans, Noto_Serif, Young_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { htmlLang, isLocale, defaultLocale } from "@/config/locales";
import "./globals.css";

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

// Fallbacks for the Igbo / Yoruba dot-below letters (ẹ ọ ị ụ live in the
// "vietnamese" subset). unicode-range means only the glyphs used are downloaded.
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin-ext", "vietnamese"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin-ext", "vietnamese"],
  weight: "400",
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
    { media: "(prefers-color-scheme: light)", color: "#FBF6EE" },
    { media: "(prefers-color-scheme: dark)", color: "#1C130D" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const lang = htmlLang[isLocale(locale) ? locale : defaultLocale];

  return (
    <html
      lang={lang}
      className={`${youngSerif.variable} ${atkinson.variable} ${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
