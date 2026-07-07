import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Makes getCloudflareContext() (D1/R2 bindings from wrangler.jsonc + .dev.vars)
// available inside `next dev`. Guarded: during `next build` the miniflare/workerd
// startup is unnecessary (and workerd crashes on Windows paths with diacritics).
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "hr.matviet.com.vn" }],
  },
  async redirects() {
    return [
      // 2026-07-07 rename: /tin-tuyen-dung → /vi-tri (old bookmarks + agent-emitted links)
      { source: "/tin-tuyen-dung", destination: "/vi-tri", permanent: true },
      { source: "/tin-tuyen-dung/:path*", destination: "/vi-tri/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // SAMEORIGIN (not DENY): the CV preview iframes /api/files/* same-origin
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
