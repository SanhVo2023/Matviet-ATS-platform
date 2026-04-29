import Link from "next/link";
import { CheckCircle2, FileText, Send } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/vi-format";
import { signTestUrl, signSubmissionUrl } from "@/server/assessments/repository";
import { lookupProfileNames } from "@/server/candidates/repository";
import { SendAssessmentTrigger } from "./SendAssessmentDialog";
import { GradeSubmissionForm } from "./GradeSubmissionForm";
import { UploadAnswerOnBehalfButton } from "./UploadAnswerOnBehalfButton";
import type { AssessmentRow, AssessmentSubmissionRow } from "@/server/assessments/repository";

interface Props {
  candidateId: string;
  candidateName: string;
  assessment: AssessmentRow | null;
  submission: AssessmentSubmissionRow | null;
  canSend: boolean;
}

/**
 * Assessment (bài test) tab on candidate detail page. Server component:
 * pre-signs the test/submission download URLs so the UI doesn't need extra
 * round-trips.
 */
export async function AssessmentsTab({
  candidateId,
  candidateName,
  assessment,
  submission,
  canSend,
}: Props) {
  if (!assessment) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-700">{t.assessment.notConfigured}</p>
        {canSend && (
          <Link
            href={`/cai-dat/bai-test/${assessment ?? ""}`}
            className="mt-4 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            {t.assessment.configureCta} →
          </Link>
        )}
      </div>
    );
  }

  // We have an assessment for the job. Sign the test download URL.
  const testUrl = assessment.test_storage_path
    ? await signTestUrl(assessment.test_storage_path)
    : null;

  // No submission yet → show send button
  if (!submission) {
    return (
      <div className="space-y-4">
        <ConfiguredCard assessment={assessment} testUrl={testUrl} />
        {canSend && (
          <SendAssessmentTrigger
            candidateId={candidateId}
            candidateName={candidateName}
            assessmentId={assessment.id}
          />
        )}
      </div>
    );
  }

  // Submission exists. Three sub-states: awaiting submit, submitted, graded.
  const submissionUrl = submission.submission_storage_path
    ? await signSubmissionUrl(submission.submission_storage_path)
    : null;
  const graderName = submission.graded_by
    ? ((await lookupProfileNames([submission.graded_by]))[submission.graded_by] ?? "HR")
    : null;

  return (
    <div className="space-y-4">
      <ConfiguredCard assessment={assessment} testUrl={testUrl} />

      {!submission.submitted_at ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Send className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                {t.assessment.awaitingSubmission}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {/* time hint omitted — we don't have token expiry on the submission row */}
                Đã gửi lúc {formatDateTime(submission.created_at)}
              </p>
              {canSend && <UploadAnswerOnBehalfButton submissionId={submission.id} />}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-900">{t.assessment.submitted}</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                {`Ứng viên nộp lúc ${formatDateTime(submission.submitted_at)}`}
              </p>
              {submissionUrl && (
                <a
                  href={submissionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-900 hover:underline"
                >
                  Tải file bài làm →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {submission.submitted_at && (
        <>
          {submission.graded_at && submission.score != null ? (
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">
                {t.assessment.graded.replace("{{score}}", String(submission.score))}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {t.assessment.gradedBy
                  .replace("{{name}}", graderName ?? "HR")
                  .replace("{{at}}", formatDateTime(submission.graded_at))}
              </p>
              {submission.notes && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {submission.notes}
                </p>
              )}
            </div>
          ) : (
            canSend && <GradeSubmissionForm submissionId={submission.id} />
          )}
        </>
      )}
    </div>
  );
}

function ConfiguredCard({
  assessment,
  testUrl,
}: {
  assessment: AssessmentRow;
  testUrl: string | null;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">
            {assessment.original_name ?? "Đề bài"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {assessment.time_limit_min
              ? `Thời gian: ${assessment.time_limit_min} phút`
              : "Không giới hạn thời gian"}
          </p>
          {assessment.instructions && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {assessment.instructions}
            </p>
          )}
          {testUrl && (
            <a
              href={testUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              Xem đề bài →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
