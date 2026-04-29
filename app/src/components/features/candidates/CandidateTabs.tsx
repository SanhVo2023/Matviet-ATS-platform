import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CvPreview } from "./CvPreview";
import { ScoringTab } from "@/components/features/scoring/ScoringTab";
import { AssessmentsTab } from "@/components/features/assessments/AssessmentsTab";
import type { CandidateRow } from "@/server/candidates/repository";
import type { JobRow } from "@/server/jobs/repository";
import type { AiScreeningRow } from "@/server/scoring/repository";
import type { AssessmentRow, AssessmentSubmissionRow } from "@/server/assessments/repository";
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
  assessment: AssessmentRow | null;
  latestSubmission: AssessmentSubmissionRow | null;
  canSendAssessment: boolean;
  isAdmin?: boolean;
}

/**
 * Center-column tabs on the candidate detail page.
 * G3: CV preview + History.
 * G4: AI scoring tab live.
 * G5+ tabs (interviews, tests, emails, approvals) remain stubs until shipped.
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
  isAdmin,
}: Props) {
  // Default to AI tab if a screening exists OR is pending — that's the most useful view post-G4.
  const defaultTab = latestScreening || candidate.ai_screening_status !== "pending" ? "ai" : "cv";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="overflow-x-auto">
        <TabsTrigger value="cv">CV</TabsTrigger>
        <TabsTrigger value="ai">Phân tích AI</TabsTrigger>
        <TabsTrigger value="interviews" disabled>
          {t.nav.interviews}
        </TabsTrigger>
        <TabsTrigger value="tests">{t.nav.tests}</TabsTrigger>
        <TabsTrigger value="emails" disabled>
          {t.nav.emails}
        </TabsTrigger>
        <TabsTrigger value="approvals" disabled>
          {t.nav.approvals}
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
        <Stub
          title={t.nav.interviews}
          description="Group 5: lịch phỏng vấn + Microsoft Teams + form đánh giá."
        />
      </TabsContent>
      <TabsContent value="tests">
        <AssessmentsTab
          candidateId={candidate.id}
          candidateName={candidate.full_name}
          assessment={assessment}
          submission={latestSubmission}
          canSend={canSendAssessment}
        />
      </TabsContent>
      <TabsContent value="emails">
        <Stub title={t.nav.emails} description="Group 6: lịch sử email với ứng viên." />
      </TabsContent>
      <TabsContent value="approvals">
        <Stub title={t.nav.approvals} description="Group 8: quy trình duyệt 3 hoặc 4 bước." />
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
