import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Calendar, Clock, Video } from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  getInterview,
  listAttendees,
  listEvaluations,
  getEvaluation,
} from "@/server/interviews/repository";
import { getCandidate, lookupProfileNames } from "@/server/candidates/repository";
import { getJob } from "@/server/jobs/repository";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/primitives/PageHeader";
import { InterviewReviewForm } from "@/components/features/interviews/InterviewReviewForm";
import { t } from "@/lib/i18n";
import { formatDateTime, formatRelative, initials, formatVND } from "@/lib/vi-format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const iv = await getInterview(id);
  return { title: iv ? `Phỏng vấn ${formatDateTime(iv.scheduled_at)}` : t.nav.interviews };
}

export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  const { id } = await params;

  const interview = await getInterview(id);
  if (!interview) notFound();

  const [candidate, job, attendees, allEvaluations, ownEvaluation] = await Promise.all([
    getCandidate(interview.candidate_id),
    getJob(interview.job_id),
    listAttendees(id),
    listEvaluations(id),
    getEvaluation(id, profile.id),
  ]);

  const userIds = Array.from(
    new Set([
      ...attendees.map((a) => a.user_id),
      ...allEvaluations.map((e) => e.evaluator_user_id),
    ]),
  );
  const profileNames = await lookupProfileNames(userIds);

  // The current user can only review if they were invited as an attendee or are admin/hr.
  const canReview =
    profile.role === "admin" ||
    profile.role === "hr" ||
    attendees.some((a) => a.user_id === profile.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/phong-van">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {t.nav.interviews}
          </Link>
        </Button>
        <PageHeader
          icon={Calendar}
          title={`Phỏng vấn — ${candidate?.full_name ?? "—"}`}
          subtitle={`${formatDateTime(interview.scheduled_at)} · ${t.interviewType[interview.type]}`}
        />
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Detail
            icon={Calendar}
            label="Thời gian"
            value={formatDateTime(interview.scheduled_at)}
          />
          <Detail icon={Clock} label="Thời lượng" value={`${interview.duration_min} phút`} />
          <Detail
            icon={MapPin}
            label="Hình thức"
            value={
              interview.type === "video" && interview.location_or_link ? (
                <a
                  href={interview.location_or_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700 transition-colors hover:bg-accent-200"
                >
                  <Video className="h-3 w-3" aria-hidden /> Vào phòng Teams
                </a>
              ) : (
                t.interviewType[interview.type] +
                (interview.location_or_link ? ` · ${interview.location_or_link}` : "")
              )
            }
          />
          <Detail
            icon={ExternalLink}
            label={t.nav.candidates}
            value={
              candidate ? (
                <Link
                  href={`/ung-vien/${candidate.id}`}
                  className="text-primary-600 hover:underline"
                >
                  {candidate.full_name}
                </Link>
              ) : (
                "—"
              )
            }
          />
        </CardContent>
      </Card>

      {job ? (
        <p className="text-sm text-slate-500">
          Vị trí:{" "}
          <Link href={`/tin-tuyen-dung/${job.id}`} className="text-primary-600 hover:underline">
            {job.title}
          </Link>
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Người phỏng vấn
        </h2>
        <ul className="flex flex-wrap gap-2">
          {attendees.map((a) => {
            const name = profileNames[a.user_id] ?? a.user_id;
            const myEval = allEvaluations.find((e) => e.evaluator_user_id === a.user_id);
            return (
              <li
                key={a.user_id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[8px]">{initials(name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-slate-700">{name}</span>
                {myEval ? (
                  <span className="rounded bg-success-bg px-1 text-[10px] font-medium text-success-fg">
                    Đã đánh giá
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Existing reviews — read-only summary */}
      {allEvaluations.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Đánh giá đã gửi ({allEvaluations.length})
          </h2>
          <ul className="space-y-2">
            {allEvaluations.map((e) => {
              const recommendationLabel =
                e.recommendation != null ? t.recommendation[e.recommendation] : "—";
              const reviewerName = profileNames[e.evaluator_user_id] ?? e.evaluator_user_id;
              return (
                <li
                  key={e.id}
                  className="rounded-md border border-slate-200 bg-white p-3 text-xs"
                  lang="vi"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-slate-700">{reviewerName}</p>
                    <p className="text-slate-500">{formatRelative(e.created_at)}</p>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Khuyến nghị:{" "}
                    <span className="font-semibold text-slate-900">{recommendationLabel}</span>
                    {e.proposed_salary != null ? (
                      <>
                        {" "}
                        · Đề xuất lương:{" "}
                        <span className="font-mono">{formatVND(e.proposed_salary)}</span>
                      </>
                    ) : null}
                  </p>
                  {e.strengths ? (
                    <p className="mt-1 text-slate-700">
                      <span className="font-semibold">Điểm mạnh:</span> {e.strengths}
                    </p>
                  ) : null}
                  {e.concerns ? (
                    <p className="mt-1 text-slate-700">
                      <span className="font-semibold">Cân nhắc:</span> {e.concerns}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Review form for attendees + HR */}
      {canReview ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {ownEvaluation ? "Sửa đánh giá của bạn" : "Đánh giá của bạn"}
          </h2>
          <InterviewReviewForm
            interviewId={interview.id}
            candidateId={interview.candidate_id}
            existing={ownEvaluation}
          />
        </section>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-xs text-slate-500">
            Bạn không nằm trong danh sách người phỏng vấn nên không thể đánh giá.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
