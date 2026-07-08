import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { t } from "@/lib/i18n";
import {
  getCandidate,
  getCvFile,
  getStageHistory,
  signCvUrl,
  lookupProfileNames,
} from "@/server/candidates/repository";
import { getJob, getJobAssignments } from "@/server/jobs/repository";
import { getLatestScreening, getQueueStatus } from "@/server/scoring/repository";
import { getAssessmentForJob, listSubmissionsForCandidate } from "@/server/assessments/repository";
import { listInterviews, listInterviewers } from "@/server/interviews/repository";
import { listApprovalsForCandidate } from "@/server/approvals/repository";
import { CandidateHeader } from "@/components/features/candidates/CandidateHeader";
import { CandidateAiSummary } from "@/components/features/candidates/CandidateAiSummary";
import { CandidateTabs } from "@/components/features/candidates/CandidateTabs";
import { CandidateTimeline } from "@/components/features/candidates/CandidateTimeline";
import { ApprovalProgress } from "@/components/features/approvals/ApprovalProgress";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const candidate = await getCandidate(id);
  return { title: candidate ? `${candidate.full_name} · Ứng viên` : "Ứng viên" };
}

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  const { id } = await params;

  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  // Hiring managers only see candidates on their assigned jobs (ADR 0011)
  if (profile.role === "hiring_manager") {
    const assignments = await getJobAssignments(candidate.job_id);
    if (!assignments.some((a) => a.manager_user_id === profile.id)) notFound();
  }

  const [
    job,
    cvFile,
    history,
    latestScreening,
    queueStatus,
    assessment,
    submissions,
    interviews,
    approvals,
    interviewers,
  ] = await Promise.all([
    getJob(candidate.job_id),
    candidate.cv_file_id ? getCvFile(candidate.cv_file_id) : Promise.resolve(null),
    getStageHistory(candidate.id),
    getLatestScreening(candidate.id),
    getQueueStatus(candidate.id),
    getAssessmentForJob(candidate.job_id),
    listSubmissionsForCandidate(candidate.id),
    listInterviews({ candidate_id: candidate.id }),
    listApprovalsForCandidate(candidate.id),
    listInterviewers(),
  ]);
  const latestSubmission = submissions[0] ?? null;

  const signedUrl = cvFile ? await signCvUrl(cvFile.storage_path) : null;

  // Resolve actor names for the timeline + approval history
  const actorIds = Array.from(
    new Set([
      ...history.map((h) => h.actor_user_id).filter((x): x is string => !!x),
      ...approvals.map((a) => a.actor_user_id).filter((x): x is string => !!x),
    ]),
  );
  const actorNames = await lookupProfileNames(actorIds);

  // Determine if the current user owns the manager_recommend step (via job_assignments)
  const jobAssignments = await getJobAssignments(candidate.job_id);
  const currentUserOwnsManagerStep = jobAssignments.some((a) => a.manager_user_id === profile.id);

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      {/* Back to the candidates table (every detail page gets a way back) */}
      <Link
        href="/ung-vien"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-brand-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> {t.nav.candidates}
      </Link>
      {/* Identity + journey header (2026-07-08 redesign): where the candidate
          is (kanban's 4 business groups) and what's next, at a glance. */}
      <CandidateHeader
        candidate={candidate}
        jobTitle={job?.title ?? null}
        jobId={candidate.job_id}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main column — AI narrative first, then the 3 merged tabs */}
        <div className="space-y-4 lg:col-span-8">
          <CandidateAiSummary
            candidateId={candidate.id}
            initialSummary={candidate.ai_summary}
            summaryAt={candidate.ai_summary_at}
          />
          <CandidateTabs
            candidate={candidate}
            job={job}
            cv={
              cvFile
                ? {
                    signedUrl,
                    mime: cvFile.mime,
                    originalName: cvFile.original_name,
                  }
                : undefined
            }
            latestScreening={latestScreening}
            queueStatus={queueStatus}
            assessment={assessment}
            latestSubmission={latestSubmission}
            canSendAssessment={profile.role === "admin" || profile.role === "hr"}
            hrName={profile.full_name ?? "Phòng Nhân sự"}
            interviews={interviews}
            interviewers={interviewers}
            currentRole={profile.role}
            isAdmin={profile.role === "admin"}
          />
        </div>

        {/* Side rail — Lịch sử, approvals, internal notes */}
        <div className="lg:col-span-4">
          <CandidateTimeline history={history} actorNames={actorNames} />
          <ApprovalProgress
            candidateId={candidate.id}
            approvals={approvals}
            currentRole={profile.role}
            currentUserOwnsManagerStep={currentUserOwnsManagerStep}
            actorNames={actorNames}
            canStart={
              profile.role === "admin" || profile.role === "hr" || profile.role === "hiring_manager"
            }
          />
          {candidate.notes ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Ghi chú nội bộ
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{candidate.notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
