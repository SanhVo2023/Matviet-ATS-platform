import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, ListIcon } from "lucide-react";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { getJob, getJobAssignments, listJobs } from "@/server/jobs/repository";
import { listCandidates } from "@/server/candidates/repository";
import { getDb } from "@/db";
import { departments, users } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/PageHeader";
import { JobStatusBadge } from "@/components/primitives/StatusBadge";
import { KanbanBoard } from "@/components/features/pipeline/KanbanBoard";
import { AddCandidateButton } from "@/components/features/candidates/AddCandidateButton";
import { CsvImportTrigger } from "@/components/features/csv-import/CsvImportTrigger";
import { JobInfoPanel, JobInfoBody, type JobInfo } from "@/components/features/jobs/JobInfoPanel";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return { title: job ? `${job.title} · ${t.nav.jobs}` : t.nav.jobs };
}

/**
 * The Vị trí HIRING WORKSPACE (ADR 0016): this position's candidates as a
 * kanban front-and-center; the job's own record demoted to the
 * "Thông tin vị trí" SlideOver tool. Exec roles (bod/tap_doan) get the
 * fact sheet inline instead — they work from the approvals inbox, not the
 * pipeline.
 */
export default async function JobWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);
  const { id } = await params;

  const job = await getJob(id);
  if (!job) notFound();

  const isExec = profile.role === "bod" || profile.role === "tap_doan";
  const canManage = profile.role === "admin" || profile.role === "hr";

  const db = await getDb();
  const [assignments, department, candidates, allJobs] = await Promise.all([
    getJobAssignments(id),
    job.department_id
      ? db
          .select({ name: departments.name })
          .from(departments)
          .where(eq(departments.id, job.department_id))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null as null | { name: string }),
    // Mirrors the old RLS policy: HR/admin see all candidates; a hiring
    // manager only those on jobs assigned to them; exec approvers see none.
    canManage
      ? listCandidates({ job_id: id })
      : profile.role === "hiring_manager"
        ? listCandidates({ job_id: id, for_manager_user_id: profile.id })
        : Promise.resolve([]),
    canManage ? listJobs() : Promise.resolve([]),
  ]);

  const managerIds = assignments.map((a) => a.manager_user_id);
  const managers = managerIds.length
    ? await db
        .select({ id: users.id, full_name: users.name })
        .from(users)
        .where(inArray(users.id, managerIds))
    : ([] as Array<{ id: string; full_name: string | null }>);

  const jobInfo: JobInfo = {
    id: job.id,
    title: job.title,
    status: job.status,
    headcount: job.headcount,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    flow_type: job.flow_type,
    posted_at: job.posted_at,
    roleFamilyLabel: t.roleFamily[job.role_family],
    departmentName: department?.name ?? null,
    location: job.location,
    descriptionHtml: job.description ?? "",
    requirementsHtml: (job.requirements as { html?: string } | null)?.html ?? "",
    weights: (job.weights as Record<string, number>) ?? {},
    managers,
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        back="/"
        backLabel="Về Tổng quan"
        icon={Briefcase}
        title={job.title}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            <span>
              {jobInfo.roleFamilyLabel}
              {jobInfo.departmentName ? ` · ${jobInfo.departmentName}` : ""}
              {job.location ? ` · ${job.location}` : ""}
              {!isExec ? ` · ${candidates.length} ${t.nav.candidates.toLowerCase()}` : ""}
            </span>
          </span>
        }
        action={
          isExec ? undefined : (
            <>
              <Button asChild variant="ghost">
                <Link href={`/ung-vien?job=${job.id}`}>
                  <ListIcon className="h-4 w-4" aria-hidden /> {t.pipeline.viewToggle.table}
                </Link>
              </Button>
              <JobInfoPanel job={jobInfo} canEdit={canManage} />
              {canManage ? <CsvImportTrigger jobId={job.id} jobTitle={job.title} /> : null}
              {canManage ? (
                <AddCandidateButton
                  jobId={job.id}
                  jobs={allJobs.map((j) => ({ id: j.id, title: j.title, status: j.status }))}
                />
              ) : null}
            </>
          )
        }
      />

      {isExec ? (
        // Exec view — fact sheet only; approvals live in /phe-duyet
        <div className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
          <JobInfoBody job={jobInfo} canEdit={false} />
        </div>
      ) : (
        <>
          {candidates.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
              <p className="text-sm font-medium text-slate-700">{t.empty.candidates}</p>
              <p className="mt-1 text-xs text-slate-500">
                Bấm “Thêm ứng viên” hoặc nhập CSV để bắt đầu chấm điểm + theo dõi pipeline.
              </p>
            </div>
          ) : (
            <KanbanBoard candidates={candidates} jobId={job.id} />
          )}
        </>
      )}
    </div>
  );
}
