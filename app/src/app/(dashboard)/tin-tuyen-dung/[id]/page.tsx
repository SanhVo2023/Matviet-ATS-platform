import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getJob, getJobAssignments, listJobs } from "@/server/jobs/repository";
import { listCandidates } from "@/server/candidates/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/primitives/StatusBadge";
import { JobCandidatesPanel } from "@/components/features/candidates/JobCandidatesPanel";
import { CsvImportTrigger } from "@/components/features/csv-import/CsvImportTrigger";
import { t } from "@/lib/i18n";
import { formatDate, formatVND } from "@/lib/vi-format";
import { SCORING_CRITERION_CODES } from "@/lib/constants";
import { JobStatusActions } from "./JobStatusActions";

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

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);
  const { id } = await params;

  const job = await getJob(id);
  if (!job) notFound();

  // Fetch supporting data
  const [assignments, deptResult, candidates, allJobs] = await Promise.all([
    getJobAssignments(id),
    job.department_id
      ? createAdminClient()
          .from("departments")
          .select("name")
          .eq("id", job.department_id)
          .maybeSingle()
      : Promise.resolve({ data: null as null | { name: string } }),
    listCandidates({ job_id: id }),
    listJobs(),
  ]);

  const managerIds = assignments.map((a) => a.manager_user_id);
  const managers = managerIds.length
    ? await createAdminClient().from("profiles").select("id, full_name").in("id", managerIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };

  const weights = (job.weights as Record<string, number>) ?? {};
  const description = job.description ?? "";
  const requirementsHtml = (job.requirements as { html?: string } | null)?.html ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-sm text-slate-500">
            {t.roleFamily[job.role_family]}
            {deptResult.data?.name ? ` · ${deptResult.data.name}` : ""}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/tin-tuyen-dung/${job.id}/sua`}>
              <Pencil className="h-4 w-4" aria-hidden /> {t.action.edit}
            </Link>
          </Button>
          <JobStatusActions jobId={job.id} status={job.status} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">{t.jobForm.headcount}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{job.headcount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Lương</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {formatSalary(job.salary_min, job.salary_max)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Quy trình duyệt</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {job.flow_type === "staff" ? t.jobForm.flowType.staff : t.jobForm.flowType.management}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Đăng ngày</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {job.posted_at ? formatDate(job.posted_at) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.jobForm.description}</CardTitle>
          </CardHeader>
          <CardContent>
            {description ? (
              <div
                className="prose prose-sm max-w-none text-slate-700"
                lang="vi"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : (
              <p className="text-sm text-slate-400">Chưa có mô tả.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.jobForm.weights.title}</CardTitle>
            <CardDescription>Áp dụng tự động cho mọi CV thuộc tin này.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {SCORING_CRITERION_CODES.map((k) => (
                <li key={k} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-600">{t.criterion[k]}</span>
                  <span className="font-mono text-sm tabular-nums text-slate-900">
                    {Math.round((weights[k] ?? 0) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.jobForm.requirements}</CardTitle>
        </CardHeader>
        <CardContent>
          {requirementsHtml ? (
            <div
              className="prose prose-sm max-w-none text-slate-700"
              lang="vi"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: requirementsHtml }}
            />
          ) : (
            <p className="text-sm text-slate-400">Chưa có yêu cầu.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.jobForm.hiringManager}</CardTitle>
        </CardHeader>
        <CardContent>
          {managers.data && managers.data.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {managers.data.map((m) => (
                <li
                  key={m.id}
                  className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800"
                >
                  {m.full_name ?? m.id}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Chưa có trưởng phòng nào được gán.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>{t.nav.candidates}</CardTitle>
            <CardDescription>Ứng viên đang ứng tuyển vào vị trí này.</CardDescription>
          </div>
          <CsvImportTrigger jobId={job.id} jobTitle={job.title} />
        </CardHeader>
        <CardContent>
          <JobCandidatesPanel
            jobId={job.id}
            jobs={allJobs.map((j) => ({ id: j.id, title: j.title, status: j.status }))}
            candidates={candidates}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function formatSalary(min: number | null, max: number | null) {
  if (min == null && max == null) return "Thương lượng";
  if (min != null && max != null) return `${formatVND(min)} – ${formatVND(max)}`;
  return formatVND(min ?? max ?? 0);
}
