import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
// Astryx design system (ADR 0016) — order matters: reset → components → theme
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@/styles/themes/matviet/matviet.css";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { t } from "@/lib/i18n";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://hr.matviet.com.vn"),
  title: {
    default: `${t.app.name} — ${t.app.description}`,
    template: `%s · ${t.app.name}`,
  },
  description: t.app.description,
  applicationName: t.app.name,
  authors: [{ name: "Sanh Võ" }],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: t.app.name,
    title: t.app.name,
    description: t.app.description,
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme on <html> = SSR-safe light mode (Astryx Theme syncs it on hydration)
    <html lang="vi" data-theme="light" suppressHydrationWarning>
      <body className={`${beVietnamPro.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
