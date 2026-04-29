import type { Metadata } from "next";
import Image from "next/image";
import { AlertTriangle, FileText } from "lucide-react";
import { getActiveInviteToken, getAssessment, signTestUrl } from "@/server/assessments/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { TestSubmitForm } from "@/components/features/test-public/TestSubmitForm";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/vi-format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: t.assessment.publicTitle,
  robots: { index: false, follow: false },
};

export default async function PublicTestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getActiveInviteToken(token);

  // Token invalid → render friendly error (no auth, no internal hint)
  if (!invite) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-6">
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-6 w-6 text-rose-600" aria-hidden />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{t.assessment.invalidToken}</h1>
              <p className="mt-2 text-sm text-slate-600">
                Vui lòng liên hệ với Phòng Nhân sự Mắt Việt qua{" "}
                <a className="text-primary-600 hover:underline" href="mailto:hr@matkinh.com.vn">
                  hr@matkinh.com.vn
                </a>{" "}
                để được cấp lại liên kết.
              </p>
            </div>
          </div>
        </Card>
      </main>
    );
  }

  // Already submitted → friendly thank-you (don't allow re-upload)
  if (invite.used_at || invite.submission_id == null) {
    return <ThanksScreen alreadySubmitted />;
  }

  const assessment = await getAssessment(invite.assessment_id);
  if (!assessment) {
    return <ThanksScreen alreadySubmitted />;
  }

  // Look up candidate name + job title via admin client
  const admin = createAdminClient();
  const [{ data: candidateRow }, { data: jobRow }] = await Promise.all([
    admin.from("candidates").select("full_name").eq("id", invite.candidate_id).maybeSingle(),
    admin.from("jobs").select("title").eq("id", assessment.job_id).maybeSingle(),
  ]);
  const candidateName = (candidateRow as { full_name: string } | null)?.full_name ?? "Ứng viên";
  const jobTitle = (jobRow as { title: string } | null)?.title ?? "—";

  const testUrl = assessment.test_storage_path
    ? await signTestUrl(assessment.test_storage_path, 3600)
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start gap-6 p-6 lg:p-12">
      <div className="flex items-center gap-2">
        <Image src="/brand/MV2.png" alt="Mắt Việt" width={48} height={48} unoptimized />
        <span className="text-sm font-semibold text-slate-700">Mắt Việt — Phòng Nhân sự</span>
      </div>

      <Card>
        <h1 className="text-xl font-semibold text-slate-900">{t.assessment.publicTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.assessment.publicGreeting.replace("{{name}}", candidateName)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Bài kiểm tra cho vị trí <strong>{jobTitle}</strong>.
        </p>
        <p className="mt-2 text-sm text-slate-600">{t.assessment.publicInstructions}</p>

        {assessment.instructions && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Hướng dẫn
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {assessment.instructions}
            </p>
          </div>
        )}

        {assessment.time_limit_min && (
          <p className="mt-3 text-xs text-slate-500">
            Thời gian dự kiến: <strong>{assessment.time_limit_min} phút</strong>
          </p>
        )}

        {testUrl && (
          <a
            href={testUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-900 hover:border-primary-300 hover:bg-primary-100"
          >
            <FileText className="h-4 w-4" aria-hidden /> {t.assessment.publicDownload}
          </a>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Hạn nộp: <strong>{formatDateTime(invite.expires_at)}</strong>
        </p>
      </Card>

      <Card>
        <TestSubmitForm token={token} />
      </Card>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

function ThanksScreen({ alreadySubmitted }: { alreadySubmitted?: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-6">
      <Card>
        <h1 className="text-lg font-semibold text-emerald-700">{t.assessment.publicThanks}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {alreadySubmitted
            ? "Bài làm của bạn đã được ghi nhận trước đó."
            : t.assessment.publicThanksDetail}
        </p>
      </Card>
    </main>
  );
}
