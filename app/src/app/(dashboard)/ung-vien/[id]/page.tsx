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
import {
  listInterviews,
  listInterviewers,
  listEvaluationsForCandidate,
} from "@/server/interviews/repository";
import { listApprovalsForCandidate } from "@/server/approvals/repository";
import { listCandidateEmails } from "@/server/email/repository";
import { listActiveTemplates } from "@/server/email/templates";
import { getComposerVarDefaults } from "@/server/email/composer-defaults";
import { CandidateHeader } from "@/components/features/candidates/CandidateHeader";
import { CandidateAiSummary } from "@/components/features/candidates/CandidateAiSummary";
import { CandidateJourney } from "@/components/features/candidates/journey/CandidateJourney";
import {
  CandidateReferenceRail,
  type RailEmailRow,
} from "@/components/features/candidates/CandidateReferenceRail";
import { ChangeCvButton } from "@/components/features/candidates/ChangeCvButton";
import { ComposeEmailButton } from "@/components/features/emails/ComposeEmailButton";

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

/**
 * Candidate page v3 (ADR 0019): the hiring journey ladder IS the page.
 * Header answers "who + how good"; the ladder answers "where + what
 * happened at each rung + what's next"; the rail holds reference material.
 */
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

  const canManage = profile.role === "admin" || profile.role === "hr";

  const [
    job,
    cvFile,
    history,
    latestScreening,
    queueStatus,
    assessment,
    submissions,
    interviews,
    evaluations,
    approvals,
    interviewers,
    emails,
  ] = await Promise.all([
    getJob(candidate.job_id),
    candidate.cv_file_id ? getCvFile(candidate.cv_file_id) : Promise.resolve(null),
    getStageHistory(candidate.id),
    getLatestScreening(candidate.id),
    getQueueStatus(candidate.id),
    getAssessmentForJob(candidate.job_id),
    listSubmissionsForCandidate(candidate.id),
    listInterviews({ candidate_id: candidate.id }),
    listEvaluationsForCandidate(candidate.id),
    listApprovalsForCandidate(candidate.id),
    listInterviewers(),
    listCandidateEmails(candidate.id),
  ]);
  const latestSubmission = submissions[0] ?? null;

  const signedUrl = cvFile ? await signCvUrl(cvFile.storage_path) : null;

  // Resolve actor names: timeline + approvals + interview evaluators
  const actorIds = Array.from(
    new Set([
      ...history.map((h) => h.actor_user_id).filter((x): x is string => !!x),
      ...approvals.map((a) => a.actor_user_id).filter((x): x is string => !!x),
      ...evaluations.map((e) => e.evaluator_user_id),
    ]),
  );
  const actorNames = await lookupProfileNames(actorIds);

  // Does the current user own the manager_recommend step (via job_assignments)?
  const jobAssignments = await getJobAssignments(candidate.job_id);
  const currentUserOwnsManagerStep = jobAssignments.some((a) => a.manager_user_id === profile.id);

  // Email composer needs server data (templates + var defaults) — prepare the
  // button here and hand it into client shells as slots.
  const hrName = profile.full_name ?? "Phòng Nhân sự";
  const [templates, autoVars] = canManage
    ? await Promise.all([listActiveTemplates(), getComposerVarDefaults(candidate.id, hrName)])
    : [[], {}];
  const composeButton =
    canManage && candidate.email ? (
      <ComposeEmailButton
        templates={templates}
        defaults={{
          candidateId: candidate.id,
          jobId: candidate.job_id,
          to: [candidate.email],
          vars: {
            ...autoVars,
            candidate_name: candidate.full_name,
            job_title: job?.title ?? "",
            hr_name: hrName,
            company_name: "Mắt Việt",
          },
          lockRecipient: true,
        }}
        size="sm"
        variant="navy"
        label="Gửi email"
      />
    ) : null;

  const railEmails: RailEmailRow[] = emails.map((e) => ({
    id: e.id,
    subject: e.subject,
    direction: e.direction,
    to_emails: e.to_emails ?? [],
    template_code: e.template_code,
    error: e.error,
    status: e.status,
    sent_at: e.sent_at,
    created_at: e.created_at,
  }));

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      {/* Back to the candidates table (every detail page gets a way back) */}
      <Link
        href="/ung-vien"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-brand-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> {t.nav.candidates}
      </Link>

      <CandidateHeader
        candidate={candidate}
        jobTitle={job?.title ?? null}
        jobId={candidate.job_id}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main — AI narrative, then the journey ladder */}
        <div className="space-y-4 lg:col-span-8">
          <CandidateAiSummary
            candidateId={candidate.id}
            initialSummary={candidate.ai_summary}
            summaryAt={candidate.ai_summary_at}
          />
          <CandidateJourney
            candidate={candidate}
            job={job}
            latestScreening={latestScreening}
            queueStatus={queueStatus}
            isAdmin={profile.role === "admin"}
            currentRole={profile.role}
            interviews={interviews}
            interviewers={interviewers}
            evaluations={evaluations}
            assessment={assessment}
            latestSubmission={latestSubmission}
            approvals={approvals}
            actorNames={actorNames}
            currentUserOwnsManagerStep={currentUserOwnsManagerStep}
            history={history}
            offerComposeSlot={composeButton}
          />
        </div>

        {/* Reference rail — contact, CV, notes, emails */}
        <div className="lg:col-span-4">
          <CandidateReferenceRail
            contact={{
              email: candidate.email,
              phone: candidate.phone,
              location: candidate.location,
              createdAt: candidate.created_at,
            }}
            cv={
              cvFile ? { signedUrl, mime: cvFile.mime, originalName: cvFile.original_name } : null
            }
            cvActionSlot={canManage ? <ChangeCvButton candidateId={candidate.id} /> : undefined}
            notes={candidate.notes}
            emails={railEmails}
            composeSlot={composeButton}
          />
        </div>
      </div>
    </div>
  );
}
