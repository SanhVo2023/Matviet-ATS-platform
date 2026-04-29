import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CvPreview } from "./CvPreview";
import { ScoringTab } from "@/components/features/scoring/ScoringTab";
import { InterviewsTab } from "@/components/features/interviews/InterviewsTab";
import { ApprovalsTab } from "@/components/features/approvals/ApprovalsTab";
import type { CandidateRow } from "@/server/candidates/repository";
import type { JobRow } from "@/server/jobs/repository";
import type { AiScreeningRow } from "@/server/scoring/repository";
import type { InterviewRow } from "@/server/interviews/repository";
import type { ApprovalRow } from "@/server/approvals/repository";
import type { Database } from "@/types/db";
import { t } from "@/lib/i18n";

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
  interviews: InterviewRow[];
  approvals: ApprovalRow[];
  interviewers: Array<{ id: string; full_name: string | null; role: string }>;
  actorNames: Record<string, string>;
  currentRole: Database["public"]["Enums"]["user_role"];
  isAdmin?: boolean;
  /** Manager assignment lookup for the approval timeline. */
  currentUserOwnsManagerStep?: boolean;
}

/**
 * Center-column tabs on the candidate detail page.
 * G3: CV preview + History.
 * G4: AI scoring tab live.
 * G8: Interviews + Approvals tabs live.
 * G6/G7: Emails / Tests still stubs until those groups ship.
 */
export function CandidateTabs({
  candidate,
  job,
  cv,
  latestScreening,
  queueStatus,
  interviews,
  approvals,
  interviewers,
  actorNames,
  currentRole,
  isAdmin,
  currentUserOwnsManagerStep,
}: Props) {
  // Default tab: prioritise pending approvals → AI scoring → CV
  const defaultTab = approvals.some((a) => a.status === "pending")
    ? "approvals"
    : latestScreening || candidate.ai_screening_status !== "pending"
      ? "ai"
      : "cv";

  const canScheduleInterview = currentRole === "admin" || currentRole === "hr";
  const canStartApproval =
    currentRole === "admin" || currentRole === "hr" || currentRole === "hiring_manager";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="overflow-x-auto">
        <TabsTrigger value="cv">CV</TabsTrigger>
        <TabsTrigger value="ai">Phân tích AI</TabsTrigger>
        <TabsTrigger value="interviews">{t.nav.interviews}</TabsTrigger>
        <TabsTrigger value="approvals">{t.nav.approvals}</TabsTrigger>
        <TabsTrigger value="tests" disabled>
          {t.nav.tests}
        </TabsTrigger>
        <TabsTrigger value="emails" disabled>
          {t.nav.emails}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cv">
        {cv ? (
          <CvPreview signedUrl={cv.signedUrl} mime={cv.mime} originalName={cv.originalName} />
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Chưa có CV được đính kèm.
          </div>
        )}
      </TabsContent>

      <TabsContent value="ai">
        <ScoringTab
          candidate={candidate}
          job={job}
          latestScreening={latestScreening}
          queueStatus={queueStatus}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="interviews">
        <InterviewsTab
          candidateId={candidate.id}
          candidateName={candidate.full_name}
          interviews={interviews}
          interviewers={interviewers}
          canSchedule={canScheduleInterview}
        />
      </TabsContent>

      <TabsContent value="approvals">
        <ApprovalsTab
          candidateId={candidate.id}
          approvals={approvals}
          currentRole={currentRole}
          currentUserOwnsManagerStep={currentUserOwnsManagerStep}
          actorNames={actorNames}
          canStart={canStartApproval}
        />
      </TabsContent>

      <TabsContent value="tests">
        <Stub title={t.nav.tests} description="Group 9: gửi bài test, nhận bài làm, chấm điểm." />
      </TabsContent>
      <TabsContent value="emails">
        <Stub title={t.nav.emails} description="Group 6: lịch sử email với ứng viên." />
      </TabsContent>
    </Tabs>
  );
}

function Stub({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
