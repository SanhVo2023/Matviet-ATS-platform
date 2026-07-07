import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Kanban, ListIcon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getJob, getJobAssignments } from "@/server/jobs/repository";
import { listCandidates } from "@/server/candidates/repository";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/primitives/StatusBadge";
import { PageHeader } from "@/components/primitives/PageHeader";
import { KanbanBoard } from "@/components/features/pipeline/KanbanBoard";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return { title: job ? `Kanban · ${job.title}` : "Kanban" };
}

export default async function JobPipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  const { id } = await params;

  const job = await getJob(id);
  if (!job) notFound();

  // Hiring managers only see pipelines for their assigned jobs (ADR 0011)
  if (profile.role === "hiring_manager") {
    const assignments = await getJobAssignments(id);
    if (!assignments.some((a) => a.manager_user_id === profile.id)) notFound();
  }

  const candidates = await listCandidates({ job_id: id });

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        icon={Kanban}
        title={job.title}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            <span>
              {candidates.length} {t.nav.candidates.toLowerCase()}
            </span>
          </span>
        }
        action={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/vi-tri/${job.id}`}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Chi tiết tin
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/ung-vien?job=${job.id}`}>
                <ListIcon className="h-4 w-4" aria-hidden /> {t.pipeline.viewToggle.table}
              </Link>
            </Button>
          </>
        }
      />

      {candidates.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <p className="text-sm font-medium text-slate-700">{t.empty.candidates}</p>
          <p className="mt-1 text-xs text-slate-500">
            Tải CV lên từ trang chi tiết vị trí để bắt đầu chấm điểm + theo dõi pipeline.
          </p>
        </div>
      ) : (
        <KanbanBoard candidates={candidates} jobId={job.id} />
      )}
    </div>
  );
}
