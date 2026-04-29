import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.assessment.publicThanks,
  robots: { index: false, follow: false },
};

export default function PublicTestThankYouPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6">
      <div className="w-full rounded-lg border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-emerald-800">{t.assessment.publicThanks}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.assessment.publicThanksDetail}</p>
        <p className="mt-6 text-xs text-slate-400">Mắt Việt — Phòng Nhân sự</p>
      </div>
    </main>
  );
}
