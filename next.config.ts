import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Cache Components is OFF on purpose (BUILD_PLAN "pick the simpler option"):
  // the locale comes from a cookie on every request, and with Cache Components
  // every cookie read must sit inside a Suspense boundary. Revisit after Stage 5.
  cacheComponents: false,
  // The dev badge covers page content in design-review screenshots.
  devIndicators: false,
  // Roster/registry CSVs (5 MB) and licence uploads (10 MB) go through server actions.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
