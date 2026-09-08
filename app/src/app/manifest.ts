import type { MetadataRoute } from "next";

/**
 * PWA manifest (asset kit A2). The service worker (public/sw.js) already
 * handles push + offline; this makes the app INSTALLABLE — a home-screen icon
 * for store managers is the cheapest "mobile app" we can ship. Vietnamese,
 * standalone, navy chrome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mắt Việt HR",
    short_name: "MV HR",
    description: "Hệ thống nhân sự & tuyển dụng nội bộ Mắt Việt",
    lang: "vi",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5fa",
    theme_color: "#0b1430",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
