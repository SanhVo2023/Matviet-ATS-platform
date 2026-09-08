import type { Metadata } from "next";
import { CircleHelp, BookOpen, ExternalLink } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/primitives/PageHeader";
import { PageContainer } from "@/components/primitives/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_BY_ROLE } from "@/lib/help-content";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hướng dẫn" };

/** Shareable visual onboarding guide (real screenshots + walkthrough). */
const VISUAL_GUIDE_URL = "https://claude.ai/code/artifact/349a75a6-5d1a-4104-b73c-46d1b8a62bd2";

/** Role-scoped in-app SOP (renovation R3) — replaces "no help anywhere". */
export default async function HelpPage() {
  const profile = await requireSession();
  const sections = HELP_BY_ROLE[profile.role] ?? [];

  return (
    <PageContainer size="narrow" className="space-y-4">
      <PageHeader
        icon={CircleHelp}
        title="Hướng dẫn sử dụng"
        subtitle={`Dành cho vai trò: ${t.userRole[profile.role]}`}
      />

      <a
        href={VISUAL_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 rounded-xl border border-accent-300 bg-accent-50 p-5 transition hover:border-accent-400 hover:shadow-sm"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-brand-900 text-accent-400">
          <BookOpen className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-brand-900">
            Hướng dẫn bằng hình ảnh — có ảnh màn hình thật
          </span>
          <span className="mt-0.5 block text-sm text-slate-600">
            Đi qua cả quy trình tuyển dụng theo 10 bước, kèm ảnh minh hoạ từng màn hình. Mở trong
            tab mới.
          </span>
        </span>
        <ExternalLink className="h-4 w-4 flex-none text-accent-600 transition group-hover:translate-x-0.5" />
      </a>

      {sections.map((s) => (
        <Card key={s.title}>
          <CardHeader>
            <CardTitle className="text-base text-brand-900">{s.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 marker:font-semibold marker:text-accent-600">
              {s.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ))}
    </PageContainer>
  );
}
