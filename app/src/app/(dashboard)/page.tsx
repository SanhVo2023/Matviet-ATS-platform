import Link from "next/link";
import { FileText, Calendar, CheckCircle2, ArrowRight, Video, Phone, Plus } from "lucide-react";
import { requireSession, isHr, isManager } from "@/lib/auth";
import {
  getHrDashboardData,
  getManagerInboxData,
  getExecQueueData,
  getActionInbox,
  type TodayInterviewItem,
  type ActionInboxItem,
} from "@/server/dashboard/queries";
import {
  listJobs,
  listJobsForManager,
  countCandidatesByJob,
  type JobRow,
  type JobCandidateCounts,
} from "@/server/jobs/repository";
import type { PendingApprovalRow } from "@/server/approvals/repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge, JobStatusBadge } from "@/components/primitives/StatusBadge";
import { CountUp } from "@/components/primitives/CountUp";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { formatDateTime, formatRelative } from "@/lib/vi-format";
import { t, tf } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Role-conditional landing page (live since G11):
 *   - HR / admin → operations dashboard: 4 live counters + today's interviews + newest CVs
 *   - Hiring manager → to-do inbox: their pending approval steps + week's interviews
 *   - BOD / Tập đoàn → their pending approval queue
 */
export default async function HomePage() {
  const profile = await requireSession();

  if (isManager(profile.role)) {
    const [data, myJobs, counts] = await Promise.all([
      getManagerInboxData(profile.id, "hiring_manager"),
      listJobsForManager(profile.id),
      countCandidatesByJob(),
    ]);
    return (
      <ManagerInbox
        name={profile.full_name ?? "anh/chị"}
        data={data}
        jobs={myJobs}
        counts={Object.fromEntries(counts.map((c) => [c.job_id, c]))}
      />
    );
  }
  if (isHr(profile.role)) {
    const [data, inbox, jobs, counts] = await Promise.all([
      getHrDashboardData(),
      getActionInbox(),
      listJobs(),
      countCandidatesByJob(),
    ]);
    return (
      <HrDashboard
        name={profile.full_name ?? "chị Hương"}
        data={data}
        inbox={inbox}
        jobs={jobs}
        counts={Object.fromEntries(counts.map((c) => [c.job_id, c]))}
      />
    );
  }
  const steps = await getExecQueueData(profile.id, profile.role as "bod" | "tap_doan");
  return <ExecApprovalQueue name={profile.full_name ?? "anh/chị"} steps={steps} />;
}

// ---------------------------------------------------------------------------

function timeVN(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(iso));
}

/** Section title with the signature gold tick (design-language "SectionLabel"). */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-4 w-1 shrink-0 rounded-full bg-accent-400" aria-hidden />
      {children}
    </span>
  );
}

function InterviewTypeIcon({ type }: { type: TodayInterviewItem["type"] }) {
  if (type === "video") return <Video className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
  if (type === "phone") return <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
  return <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
}

type CountsByJob = Record<string, JobCandidateCounts>;

/** Position card — the Vị trí list lives ON the dashboard now (control center). */
function PositionCard({ job, counts }: { job: JobRow; counts?: JobCandidateCounts }) {
  return (
    <Link href={`/vi-tri/${job.id}`} className="group block h-full focus-visible:outline-none">
      <Card className="h-full rounded-lg bg-surface-raised transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary-500">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-brand-900">{job.title}</p>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {t.roleFamily[job.role_family]}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <p className="mt-3 text-sm text-slate-700">
            {counts && counts.total > 0 ? (
              <>
                <span className="font-semibold tabular-nums">{counts.active}</span> đang xử lý
                <span className="text-slate-400"> · </span>
                <span className="tabular-nums">
                  {counts.hired}/{job.headcount}
                </span>{" "}
                đã tuyển
              </>
            ) : (
              <span className="text-slate-400">Chưa có ứng viên</span>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function PositionsSection({ jobs, counts }: { jobs: JobRow[]; counts: CountsByJob }) {
  return (
    <section aria-label={t.nav.jobs}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          <SectionTitle>Vị trí đang tuyển</SectionTitle>
        </h2>
        <Link
          href="/vi-tri/moi"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-400 px-3 py-1.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <Plus className="h-4 w-4" aria-hidden /> Tạo vị trí mới
        </Link>
      </div>
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyLine text={t.empty.jobs} />
          </CardContent>
        </Card>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <StaggerItem key={job.id} className="h-full">
              <PositionCard job={job} counts={counts[job.id]} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}

function HrDashboard({
  name,
  data,
  inbox,
  jobs,
  counts,
}: {
  name: string;
  data: Awaited<ReturnType<typeof getHrDashboardData>>;
  inbox: ActionInboxItem[];
  jobs: JobRow[];
  counts: CountsByJob;
}) {
  const stats = [
    { label: t.dashboard.cards.newCvs, value: data.newCvs7d, href: "/ung-vien", icon: FileText },
    {
      label: t.dashboard.cards.todayInterviews,
      value: data.todayInterviewCount,
      href: "/phong-van",
      icon: Calendar,
    },
    {
      label: t.dashboard.cards.pendingApprovals,
      value: data.pendingApprovals,
      href: "/phe-duyet",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <FadeIn>
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 lg:text-3xl">
            {t.nav.dashboard}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{tf.greeting(name)}</p>
        </header>
      </FadeIn>

      {/* "Hôm nay cần làm" — every pending decision, one click from acting (ADR 0015) */}
      <FadeIn>
        <section aria-label="Hôm nay cần làm">
          <Card className="rounded-lg border-accent-400/50 bg-surface-raised">
            <CardContent className="pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                <SectionTitle>Hôm nay cần làm</SectionTitle>
              </h2>
              {inbox.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                  Không còn việc nào chờ — mọi thứ đã được xử lý. 🎉
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {inbox.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className="group flex items-center justify-between gap-3 py-2.5 transition-opacity hover:opacity-75"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-900">{item.label}</p>
                          {item.detail && <p className="text-xs text-slate-500">{item.detail}</p>}
                        </div>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </FadeIn>

      {/* Vị trí merged into the dashboard (control center — Sanh 2026-07-07) */}
      <FadeIn>
        <PositionsSection jobs={jobs} counts={counts} />
      </FadeIn>

      <section aria-label="Số liệu nhanh">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(({ label, value, href, icon: Icon }) => (
            <StaggerItem key={href + label} className="h-full">
              <Link href={href} className="group block h-full focus-visible:outline-none">
                <Card className="h-full rounded-lg bg-surface-raised transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-slate-500">{label}</p>
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-600 transition-colors group-hover:bg-brand-900 group-hover:text-accent-400"
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <CountUp
                      value={value}
                      className="mt-2 block text-3xl font-extrabold tabular-nums text-brand-900"
                    />
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              <SectionTitle>CV mới nhất</SectionTitle>
            </CardTitle>
            <Link
              href="/ung-vien"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentCandidates.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {data.recentCandidates.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/ung-vien/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 focus-visible:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{c.full_name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {c.job_title ?? "—"} · {formatRelative(c.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {c.ai_score !== null && (
                          <span className="rounded-full bg-brand-navy px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                            {Math.round(c.ai_score)}
                          </span>
                        )}
                        <StageBadge stage={c.current_stage} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine text="Chưa có ứng viên nào. Thêm CV từ trang Ứng viên hoặc import CSV." />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>
              <SectionTitle>{t.dashboard.todaySchedule.title}</SectionTitle>
            </CardTitle>
            <CardDescription>
              {data.todayInterviews.length > 0
                ? `${data.todayInterviews.length} buổi phỏng vấn hôm nay`
                : t.empty.interviewsToday}
            </CardDescription>
          </CardHeader>
          {data.todayInterviews.length > 0 && (
            <CardContent>
              <ul className="space-y-2">
                {data.todayInterviews.map((iv) => (
                  <li key={iv.id}>
                    <Link
                      href={`/phong-van/${iv.id}`}
                      className="flex items-center gap-3 rounded-md border border-slate-100 px-3 py-2 hover:border-slate-200 hover:bg-slate-50"
                    >
                      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-brand-navy">
                        {timeVN(iv.scheduled_at)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {iv.candidate_name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {iv.job_title ?? "—"}
                        </span>
                      </span>
                      <InterviewTypeIcon type={iv.type} />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}

function ManagerInbox({
  name,
  data,
  jobs,
  counts,
}: {
  name: string;
  data: Awaited<ReturnType<typeof getManagerInboxData>>;
  jobs: JobRow[];
  counts: CountsByJob;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <FadeIn>
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            {tf.greeting(name)}
          </h1>
        </header>
      </FadeIn>

      {/* Vị trí của tôi — the positions this manager owns, straight to the workspace */}
      {jobs.length > 0 && (
        <section aria-label={t.managerInbox.myJobs.title}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <SectionTitle>{t.managerInbox.myJobs.title}</SectionTitle>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <PositionCard key={job.id} job={job} counts={counts[job.id]} />
            ))}
          </div>
        </section>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>
            <SectionTitle>{t.managerInbox.toDo.title}</SectionTitle>
          </CardTitle>
          {data.pendingSteps.length > 0 && (
            <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-xs font-bold text-brand-navy">
              {data.pendingSteps.length}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {data.pendingSteps.length > 0 ? (
            <ApprovalStepList steps={data.pendingSteps} />
          ) : (
            <EmptyLine text={t.empty.managerInbox} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle>{t.managerInbox.upcomingInterviews.title}</SectionTitle>
          </CardTitle>
          {data.upcomingInterviews.length === 0 && (
            <CardDescription>{t.empty.interviewsUpcoming}</CardDescription>
          )}
        </CardHeader>
        {data.upcomingInterviews.length > 0 && (
          <CardContent>
            <ul className="space-y-2">
              {data.upcomingInterviews.map((iv) => (
                <li key={iv.id}>
                  <Link
                    href={`/phong-van/${iv.id}`}
                    className="flex items-center gap-3 rounded-md border border-slate-100 px-3 py-2 hover:border-slate-200 hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {iv.candidate_name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {formatDateTime(iv.scheduled_at)} · {iv.job_title ?? "—"}
                      </span>
                    </span>
                    <InterviewTypeIcon type={iv.type} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function ExecApprovalQueue({ name, steps }: { name: string; steps: PendingApprovalRow[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <FadeIn>
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            {tf.greeting(name)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {steps.length > 0
              ? `${steps.length} hồ sơ đang chờ quyết định của bạn.`
              : "Không có hồ sơ nào chờ duyệt."}
          </p>
        </header>
      </FadeIn>
      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle>{t.nav.approvals}</SectionTitle>
          </CardTitle>
          {steps.length === 0 && <CardDescription>{t.empty.approvals}</CardDescription>}
        </CardHeader>
        {steps.length > 0 && (
          <CardContent>
            <ApprovalStepList steps={steps} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function ApprovalStepList({ steps }: { steps: PendingApprovalRow[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {steps.slice(0, 8).map((s) => (
        <li key={s.id}>
          <Link
            href={`/ung-vien/${s.candidate_id}`}
            className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {s.candidate_name ?? "—"}
              </p>
              <p className="truncate text-xs text-slate-500">{s.job_title ?? "—"}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
          </Link>
        </li>
      ))}
      {steps.length > 8 && (
        <li className="pt-2">
          <Link href="/phe-duyet" className="text-sm font-medium text-primary-600 hover:underline">
            Xem tất cả {steps.length} hồ sơ chờ duyệt
          </Link>
        </li>
      )}
    </ul>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-4 text-sm text-slate-500">{text}</p>;
}
