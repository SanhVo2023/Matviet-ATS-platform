import type { Metadata } from "next";
import { CircleHelp } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/primitives/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_BY_ROLE } from "@/lib/help-content";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hướng dẫn" };

/** Role-scoped in-app SOP (renovation R3) — replaces "no help anywhere". */
export default async function HelpPage() {
  const profile = await requireSession();
  const sections = HELP_BY_ROLE[profile.role] ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 lg:p-8">
      <PageHeader
        icon={CircleHelp}
        title="Hướng dẫn sử dụng"
        subtitle={`Dành cho vai trò: ${t.userRole[profile.role]}`}
      />
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
    </div>
  );
}
