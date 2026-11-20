import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is OFF on purpose (BUILD_PLAN "pick the simpler option"):
  // the session and text-size cookies are read on every request, and with Cache Components
  // every cookie read must sit inside a Suspense boundary. Revisit after Stage 5.
  cacheComponents: false,
  // The dev badge covers page content in design-review screenshots.
  devIndicators: false,
  // English only (2026-11-19): old locale-prefixed URLs go to the same page without the prefix.
  async redirects() {
    return [
      { source: "/:locale(en|ig|yo|ha|pcm)", destination: "/", permanent: true },
      { source: "/:locale(en|ig|yo|ha|pcm)/:path*", destination: "/:path*", permanent: true },
    ];
  },
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

export default nextConfig;
