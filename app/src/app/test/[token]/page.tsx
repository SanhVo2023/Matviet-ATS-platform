import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { eq } from "drizzle-orm";
import { getActiveInviteToken, getAssessment } from "@/server/assessments/repository";
import { getDb } from "@/db";
import { candidates, jobs } from "@/db/schema";
import { Logo } from "@/components/layout/Logo";
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
      <CenteredShell>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-6 w-6 text-error" aria-hidden />
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
      </CenteredShell>
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

  // Look up candidate name + job title (public page — token is the authorization)
  const db = await getDb();
  const [candidateRow, jobRow] = await Promise.all([
    db
      .select({ full_name: candidates.full_name })
      .from(candidates)
      .where(eq(candidates.id, invite.candidate_id))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({ title: jobs.title })
      .from(jobs)
      .where(eq(jobs.id, assessment.job_id))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);
  const candidateName = candidateRow?.full_name ?? "Ứng viên";
  const jobTitle = jobRow?.title ?? "—";

  // Token-scoped download route — no session, streams from R2
  const testUrl = assessment.test_storage_path
    ? `/api/test/${encodeURIComponent(token)}/file`
    : null;

  return (
    <div className="min-h-screen bg-surface">
      {/* Navy gradient brand band */}
      <header className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 px-6 pb-20 pt-10">
        <div className="mx-auto max-w-2xl">
          <Logo variant="on-dark" width={150} height={44} priority />
          <h1 className="mt-8 text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
            {t.assessment.publicTitle}
          </h1>
          <p className="mt-1 text-sm text-brand-200">
            Bài kiểm tra cho vị trí <strong className="text-white">{jobTitle}</strong>
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-10 flex max-w-2xl flex-col gap-6 px-6 pb-6">
        <Card>
          <p className="text-sm text-slate-600">
            {t.assessment.publicGreeting.replace("{{name}}", candidateName)}
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
              Thời gian dự kiến:{" "}
              <strong className="tabular-nums">{assessment.time_limit_min} phút</strong>
            </p>
          )}

          {testUrl && (
            <a
              href={testUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent-400 px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm transition-colors hover:bg-accent-300"
            >
              <Download className="h-4 w-4" aria-hidden /> {t.assessment.publicDownload}
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

      <PublicFooter />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
      {children}
    </div>
  );
}

/** Centered single-card layout for error/thank-you states. */
function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-6">
        <Logo variant="primary" width={150} height={44} priority />
        <Card>{children}</Card>
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="px-6 py-8 text-center text-xs text-slate-500">
      Mắt Việt — Hệ thống tuyển dụng
    </footer>
  );
}

function ThanksScreen({ alreadySubmitted }: { alreadySubmitted?: boolean }) {
  return (
    <CenteredShell>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-1 h-6 w-6 text-success" aria-hidden />
        <div>
          <h1 className="text-lg font-semibold text-success-fg">{t.assessment.publicThanks}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {alreadySubmitted
              ? "Bài làm của bạn đã được ghi nhận trước đó."
              : t.assessment.publicThanksDetail}
          </p>
        </div>
      </div>
    </CenteredShell>
  );
}
