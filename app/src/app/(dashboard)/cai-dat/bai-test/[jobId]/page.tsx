import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ClipboardCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/server/jobs/repository";
import { getAssessmentForJob } from "@/server/assessments/repository";
import { JobAssessmentSettings } from "@/components/features/assessments/JobAssessmentSettings";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/primitives/PageHeader";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJob(jobId);
  return {
    title: `${t.assessment.tabTitle} · ${job?.title ?? t.nav.jobs}`,
  };
}

export default async function JobAssessmentSettingsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  await requireRole(["admin", "hr"]);
  const { jobId } = await params;

  const job = await getJob(jobId);
  if (!job) notFound();

  const existing = await getAssessmentForJob(jobId);

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <Link
        href="/cai-dat/bai-test"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Tất cả vị trí
      </Link>

      <PageHeader
        icon={ClipboardCheck}
        title={job.title}
        subtitle="Một vị trí chỉ có một bài test đang hoạt động. Tải file mới sẽ thay thế file cũ."
        className="mb-6"
      />

      <Card>
        <CardContent className="p-6">
          <JobAssessmentSettings
            jobId={job.id}
            jobTitle={job.title}
            existing={
              existing
                ? {
                    id: existing.id,
                    original_name: existing.original_name,
                    instructions: existing.instructions,
                    time_limit_min: existing.time_limit_min,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
