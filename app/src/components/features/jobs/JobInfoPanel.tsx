"use client";

import * as React from "react";
import Link from "next/link";
import { Info, Pencil, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlideOver } from "@/components/primitives/SlideOver";
import { JobStatusBadge } from "@/components/primitives/StatusBadge";
import { JobStatusActions } from "@/app/(dashboard)/vi-tri/[id]/JobStatusActions";
import { t } from "@/lib/i18n";
import { formatDate, formatVND } from "@/lib/vi-format";
import { SCORING_CRITERION_CODES } from "@/lib/constants";
import type { Database } from "@/types/db";

type JobStatus = Database["public"]["Enums"]["job_status"];

export interface JobInfo {
  id: string;
  title: string;
  status: JobStatus;
  headcount: number;
  salary_min: number | null;
  salary_max: number | null;
  flow_type: "staff" | "management";
  posted_at: string | null;
  roleFamilyLabel: string;
  departmentName: string | null;
  location: string | null;
  descriptionHtml: string;
  requirementsHtml: string;
  weights: Record<string, number>;
  managers: Array<{ id: string; full_name: string | null }>;
}

function formatSalary(min: number | null, max: number | null) {
  if (min == null && max == null) return "Thương lượng";
  if (min != null && max != null) return `${formatVND(min)} – ${formatVND(max)}`;
  return formatVND(min ?? max ?? 0);
}

/**
 * The job's own record, shown as a fact sheet. Used inside the
 * "Thông tin vị trí" SlideOver on the hiring workspace, and rendered inline
 * for exec roles (who get no kanban).
 */
export function JobInfoBody({ job, canEdit }: { job: JobInfo; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      {/* Status + lifecycle actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <JobStatusBadge status={job.status} />
        {canEdit ? <JobStatusActions jobId={job.id} status={job.status} /> : null}
      </div>

      {/* Quick facts */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t.jobForm.headcount}
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900">{job.headcount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Lương</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {formatSalary(job.salary_min, job.salary_max)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Quy trình duyệt
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {job.flow_type === "staff" ? t.jobForm.flowType.staff : t.jobForm.flowType.management}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Đăng ngày</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {job.posted_at ? formatDate(job.posted_at) : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t.jobForm.roleFamily}
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {job.roleFamilyLabel}
            {job.departmentName ? ` · ${job.departmentName}` : ""}
            {job.location ? ` · ${job.location}` : ""}
          </dd>
        </div>
      </dl>

      {/* Description */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-brand-900">{t.jobForm.description}</h3>
        {job.descriptionHtml ? (
          <div
            className="prose prose-sm max-w-none text-slate-700"
            lang="vi"
            dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
          />
        ) : (
          <p className="text-sm text-slate-400">Chưa có mô tả.</p>
        )}
      </section>

      {/* Requirements */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-brand-900">{t.jobForm.requirements}</h3>
        {job.requirementsHtml ? (
          <div
            className="prose prose-sm max-w-none text-slate-700"
            lang="vi"
            dangerouslySetInnerHTML={{ __html: job.requirementsHtml }}
          />
        ) : (
          <p className="text-sm text-slate-400">Chưa có yêu cầu.</p>
        )}
      </section>

      {/* Scoring weights */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-brand-900">{t.jobForm.weights.title}</h3>
        <ul className="space-y-1.5 rounded-lg border border-slate-200 p-3">
          {SCORING_CRITERION_CODES.map((k) => (
            <li key={k} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-600">{t.criterion[k]}</span>
              <span className="font-mono tabular-nums text-slate-900">
                {Math.round((job.weights[k] ?? 0) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Hiring managers */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-brand-900">{t.jobForm.hiringManager}</h3>
        {job.managers.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {job.managers.map((m) => (
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
      </section>
    </div>
  );
}

/**
 * "Thông tin vị trí" — the job record demoted to a TOOL (ADR 0016 workspace
 * pass): a SlideOver opened from the workspace header instead of occupying
 * the whole page. The kanban is the page.
 */
export function JobInfoPanel({ job, canEdit }: { job: JobInfo; canEdit: boolean }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Info className="h-4 w-4" aria-hidden /> Thông tin vị trí
      </Button>
      <SlideOver
        open={open}
        onOpenChange={setOpen}
        title={job.title}
        description="Thông tin vị trí tuyển dụng"
        width="xl"
      >
        <SlideOver.Body>
          <JobInfoBody job={job} canEdit={canEdit} />
        </SlideOver.Body>
        {canEdit ? (
          <SlideOver.Footer>
            <Button asChild variant="outline">
              <Link href={`/vi-tri/${job.id}/qr`}>
                <QrCode className="h-4 w-4" aria-hidden /> Mã QR
              </Link>
            </Button>
            <Button asChild variant="navy">
              <Link href={`/vi-tri/${job.id}/sua`}>
                <Pencil className="h-4 w-4" aria-hidden /> {t.action.edit}
              </Link>
            </Button>
          </SlideOver.Footer>
        ) : null}
      </SlideOver>
    </>
  );
}
