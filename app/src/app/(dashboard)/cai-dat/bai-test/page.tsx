import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listJobs } from "@/server/jobs/repository";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assessments } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${t.assessment.tabTitle} · ${t.nav.settings}`,
};

export default async function BaiTestSettingsListPage() {
  await requireRole(["admin", "hr"]);

  const jobs = await listJobs();

  // Look up which jobs already have an active assessment
  const db = await getDb();
  const activeAssessments = await db
    .select({
      id: assessments.id,
      job_id: assessments.job_id,
      original_name: assessments.original_name,
    })
    .from(assessments)
    .where(eq(assessments.is_active, true));
  const byJob = new Map<string, { id: string; original_name: string | null }>();
  activeAssessments.forEach((a) =>
    byJob.set(a.job_id, { id: a.id, original_name: a.original_name }),
  );

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.assessment.tabTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cấu hình bài test cho từng vị trí. Một vị trí chỉ có một bài test đang hoạt động.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vị trí tuyển dụng</CardTitle>
          <CardDescription>Bấm vào một vị trí để cấu hình hoặc thay bài test.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <li className="px-6 py-12 text-center text-sm text-slate-500">
                Chưa có vị trí nào. Tạo vị trí trước tại{" "}
                <Link href="/tin-tuyen-dung" className="text-primary-600 hover:underline">
                  Tin tuyển dụng
                </Link>
                .
              </li>
            ) : (
              jobs.map((j) => {
                const a = byJob.get(j.id);
                return (
                  <li key={j.id}>
                    <Link
                      href={`/cai-dat/bai-test/${j.id}`}
                      className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4 text-slate-400" aria-hidden />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{j.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {a
                            ? `${t.assessment.configured}: ${a.original_name ?? "—"}`
                            : t.assessment.notConfigured}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
