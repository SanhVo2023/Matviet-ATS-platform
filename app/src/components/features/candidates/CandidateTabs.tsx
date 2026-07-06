import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CvPreview } from "./CvPreview";
import { ChangeCvButton } from "./ChangeCvButton";
import { ScoringTab } from "@/components/features/scoring/ScoringTab";
import { AssessmentsTab } from "@/components/features/assessments/AssessmentsTab";
import { CandidateEmailsTab } from "@/components/features/emails/CandidateEmailsTab";
import { InterviewsTab } from "@/components/features/interviews/InterviewsTab";
import type { CandidateRow } from "@/server/candidates/repository";
import type { JobRow } from "@/server/jobs/repository";
import type { AiScreeningRow } from "@/server/scoring/repository";
import type { AssessmentRow, AssessmentSubmissionRow } from "@/server/assessments/repository";
import type { InterviewRow } from "@/server/interviews/repository";
import type { Database } from "@/types/db";
import { t } from "@/lib/i18n";

/** Quiet segmented-bar look for the detail tabs (visual only — Radix Tabs stays in charge). */
const TAB_TRIGGER_CLASS =
  "rounded-full px-4 text-slate-500 hover:text-slate-700 data-[state=active]:text-brand-900 data-[state=active]:font-semibold";

interface Props {
  candidate: CandidateRow;
  job: JobRow | null;
  cv?: {
    signedUrl: string | null;
    mime: string;
    originalName: string;
  };
  latestScreening: AiScreeningRow | null;
  queueStatus: {
    status: string;
    attempts: number;
    last_error: string | null;
    enqueued_at: string;
  } | null;
  assessment: AssessmentRow | null;
  latestSubmission: AssessmentSubmissionRow | null;
  canSendAssessment: boolean;
  hrName: string;
  interviews: InterviewRow[];
  interviewers: Array<{ id: string; full_name: string | null; role: string }>;
  currentRole: Database["public"]["Enums"]["user_role"];
  isAdmin?: boolean;
}

/** Gold-tick section label used inside merged tabs (design-language SectionLabel). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      <span className="h-3.5 w-1 shrink-0 rounded-full bg-accent-400" aria-hidden />
      {children}
    </h3>
  );
}

/**
 * Center-column tabs — restructured per Sanh 2026-07-06: three tabs with a
 * clear reading order instead of six.
 *   1. "CV & Phân tích AI" — the AI verdict on top, the source document below
 *   2. "Phỏng vấn & Bài test" — everything evaluative in one place
 *   3. "Email" — correspondence
 * Approvals moved to the right rail (ApprovalProgress, under Lịch sử).
 */
export function CandidateTabs({
  candidate,
  job,
  cv,
  latestScreening,
  queueStatus,
  assessment,
  latestSubmission,
  canSendAssessment,
  hrName,
  interviews,
  interviewers,
  currentRole,
  isAdmin,
}: Props) {
  const canScheduleInterview = currentRole === "admin" || currentRole === "hr";

  return (
    <Tabs defaultValue="cv" className="w-full">
      <TabsList className="h-auto max-w-full justify-start overflow-x-auto rounded-full border-0 bg-slate-100 p-1">
        <TabsTrigger value="cv" className={TAB_TRIGGER_CLASS}>
          CV & Phân tích AI
        </TabsTrigger>
        <TabsTrigger value="interviews" className={TAB_TRIGGER_CLASS}>
          Phỏng vấn & Bài test
        </TabsTrigger>
        <TabsTrigger value="emails" className={TAB_TRIGGER_CLASS}>
          {t.nav.emails}
        </TabsTrigger>
      </TabsList>

      {/* 1 — the AI verdict first (synthesized signal), the raw CV below it */}
      <TabsContent value="cv" className="space-y-6">
        <div className="space-y-3">
          <SectionLabel>Phân tích AI</SectionLabel>
          <ScoringTab
            candidate={candidate}
            job={job}
            latestScreening={latestScreening}
            queueStatus={queueStatus}
            isAdmin={isAdmin}
          />
        </div>
        <div className="space-y-3">
          <SectionLabel>CV gốc</SectionLabel>
          {cv ? (
            <CvPreview
              signedUrl={cv.signedUrl}
              mime={cv.mime}
              originalName={cv.originalName}
              actionSlot={
                canSendAssessment ? <ChangeCvButton candidateId={candidate.id} /> : undefined
              }
            />
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              <p>Chưa có CV được đính kèm.</p>
              {canSendAssessment && (
                <div className="mt-4 flex justify-center">
                  <ChangeCvButton candidateId={candidate.id} label="Tải CV lên" />
                </div>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* 2 — everything evaluative: live interviews, then the written test */}
      <TabsContent value="interviews" className="space-y-6">
        <div className="space-y-3">
          <SectionLabel>Phỏng vấn</SectionLabel>
          <InterviewsTab
            candidateId={candidate.id}
            candidateName={candidate.full_name}
            interviews={interviews}
            interviewers={interviewers}
            canSchedule={canScheduleInterview}
          />
        </div>
        <div className="space-y-3">
          <SectionLabel>Bài test</SectionLabel>
          <AssessmentsTab
            candidateId={candidate.id}
            candidateName={candidate.full_name}
            assessment={assessment}
            submission={latestSubmission}
            canSend={canSendAssessment}
          />
        </div>
      </TabsContent>

      {/* 3 — correspondence */}
      <TabsContent value="emails">
        <CandidateEmailsTab
          candidateId={candidate.id}
          candidateName={candidate.full_name}
          candidateEmail={candidate.email}
          jobId={candidate.job_id}
          jobTitle={job?.title ?? null}
          hrName={hrName}
          canCompose={canSendAssessment}
        />
      </TabsContent>
    </Tabs>
  );
}
