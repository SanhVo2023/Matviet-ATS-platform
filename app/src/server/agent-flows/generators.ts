import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { approvals, email_messages, job_assignments, users } from "@/db/schema";
import { listEvaluationsForCandidate } from "@/server/interviews/repository";
import { STEP_LABEL_VI, APPROVAL_PRESETS } from "@/server/approvals/presets";
import { scoreVerdict } from "@/lib/stage-visuals";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/vi-format";
import { createProposal } from "./repository";
import { proposeInterviewSlots, type SlotOption } from "./slots";

/**
 * Deterministic proposal generators (ADR 0020). No AI calls here — every
 * card is assembled from data the system already has (score, evals,
 * approvals, calendars, templates). `job_from_intent` (the one generative
 * kind) lives in job-from-intent.ts.
 */

interface CandidateCtx {
  id: string;
  job_id: string;
  full_name: string;
  ai_score?: number | null;
}
interface JobCtx {
  id: string;
  title: string;
  flow_type: string;
}

export interface InterviewInvitePayload {
  slots: SlotOption[];
  duration_min: number;
  type: "video" | "onsite";
  attendee_ids: string[];
  attendee_names: string[];
  [key: string]: unknown;
}

/** CV scored well → prepared interview: 3 calendar-checked slots + invite email on approve. */
export async function proposeInterviewInvite(args: {
  candidate: CandidateCtx;
  job: JobCtx;
}): Promise<void> {
  const { candidate, job } = args;
  const db = await getDb();

  const managers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(job_assignments)
    .innerJoin(users, eq(job_assignments.manager_user_id, users.id))
    .where(eq(job_assignments.job_id, job.id));

  const slots = await proposeInterviewSlots({
    interviewerEmails: managers.map((m) => m.email).filter(Boolean),
    durationMin: 60,
  });

  const score = Math.round(candidate.ai_score ?? 0);
  const verdict = scoreVerdict(score);
  const checked = slots.some((s) => s.calendar_checked);
  const payload: InterviewInvitePayload = {
    slots,
    duration_min: 60,
    type: "video",
    attendee_ids: managers.map((m) => m.id),
    attendee_names: managers.map((m) => m.name),
  };

  await createProposal({
    jobId: job.id,
    candidateId: candidate.id,
    kind: "interview_invite",
    summary: `Mời ${candidate.full_name} phỏng vấn — điểm AI ${score} (${verdict.label})`,
    reasoning:
      `AI chấm ${score}/100 (${verdict.label}) cho vị trí ${job.title}. ` +
      (checked
        ? `Đề xuất ${slots.length} khung giờ trống theo lịch Outlook của người phỏng vấn.`
        : `Đề xuất ${slots.length} khung giờ trong giờ làm việc (chưa đối chiếu được lịch Outlook).`) +
      ` Duyệt = đặt lịch + gửi thư mời cho ứng viên.`,
    payload,
    dedupeKey: `ii:${candidate.id}`,
  });
}

/** All evaluations in → prepared "trình duyệt tuyển" with the eval digest. */
export async function proposeStartApproval(args: {
  candidate: CandidateCtx;
  job: JobCtx;
}): Promise<void> {
  const { candidate, job } = args;
  const db = await getDb();

  // Approval flow already exists → nothing to propose.
  const started = await db
    .select({ id: approvals.id })
    .from(approvals)
    .where(eq(approvals.candidate_id, candidate.id))
    .limit(1);
  if (started.length > 0) return;

  const evals = await listEvaluationsForCandidate(candidate.id);
  const withRec = evals.filter((e) => e.recommendation);
  if (withRec.length === 0) return; // nothing to base a recommendation on yet
  const positive = withRec.filter(
    (e) => e.recommendation === "strong_yes" || e.recommendation === "yes",
  ).length;

  const flow = (job.flow_type === "management" ? "management" : "staff") as "staff" | "management";
  const steps = APPROVAL_PRESETS[flow].map((s) => STEP_LABEL_VI[s]).join(" → ");

  await createProposal({
    jobId: job.id,
    candidateId: candidate.id,
    kind: "start_approval",
    summary: `Trình duyệt tuyển ${candidate.full_name} — PV: ${positive}/${withRec.length} đề xuất tuyển`,
    reasoning:
      `${positive}/${withRec.length} người phỏng vấn đề xuất tuyển. ` +
      `Quy trình duyệt (${flow === "management" ? "quản lý" : "nhân viên"}): ${steps}. ` +
      `Duyệt = tạo các bước duyệt và thông báo người duyệt đầu tiên.`,
    payload: {
      flow_type: flow,
      positive,
      total: withRec.length,
      evaluations: withRec.map((e) => ({
        recommendation: e.recommendation,
        strengths: e.strengths,
        concerns: e.concerns,
        proposed_salary: e.proposed_salary,
      })),
    },
    dedupeKey: `sa:${candidate.id}`,
  });
}

/** Fully approved → prepared offer email (magic link minted at send). */
export async function proposeComposeOffer(args: {
  candidate: CandidateCtx;
  job: JobCtx;
}): Promise<void> {
  const { candidate, job } = args;

  // Offer email already queued/sent for this candidate → skip.
  if (await hasOfferEmail(candidate.id)) return;

  // Salary hint: strongest signal is the interviewers' proposed salary.
  const evals = await listEvaluationsForCandidate(candidate.id);
  const salaries = evals
    .map((e) => e.proposed_salary)
    .filter((s): s is number => typeof s === "number" && s > 0);
  const salaryHint = salaries.length > 0 ? Math.max(...salaries) : null;

  await createProposal({
    jobId: job.id,
    candidateId: candidate.id,
    kind: "compose_offer",
    summary: `Soạn thư mời nhận việc cho ${candidate.full_name}`,
    reasoning:
      `Tất cả các bước duyệt đã thông qua. ` +
      (salaryHint
        ? `Lương đề xuất từ người phỏng vấn: ${salaryHint.toLocaleString("vi-VN")} ₫. `
        : ``) +
      `Mở soạn thư để điền lương/ngày bắt đầu — link nhận việc được tạo tự động khi gửi.`,
    payload: { template_code: "offer", salary_hint: salaryHint },
    dedupeKey: `co:${candidate.id}`,
  });
}

export async function hasOfferEmailFor(candidateId: string): Promise<boolean> {
  return hasOfferEmail(candidateId);
}

async function hasOfferEmail(candidateId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: email_messages.id, template_code: email_messages.template_code })
    .from(email_messages)
    .where(eq(email_messages.candidate_id, candidateId));
  return rows.some((r) => r.template_code === "offer");
}

/** Sweep found a genuinely idle candidate → nudge card. */
export async function proposeNudgeStale(args: {
  candidate: CandidateCtx & { current_stage: string; email: string | null };
  job: JobCtx;
  idleDays: number;
}): Promise<void> {
  const { candidate, job, idleDays } = args;
  const stage = candidate.current_stage;
  const stageLabel = (t.stage as Record<string, string>)[stage] ?? stage;
  // Waiting on the CANDIDATE → draft a reminder email; waiting on the TEAM →
  // internal nudge to whoever owns the next move.
  const waitingOnCandidate = stage === "test_sent" || stage === "offer_sent";

  await createProposal({
    jobId: job.id,
    candidateId: candidate.id,
    kind: "nudge_stale",
    summary: `${candidate.full_name} chờ ${idleDays} ngày ở "${stageLabel}"`,
    reasoning: waitingOnCandidate
      ? `Ứng viên chưa phản hồi sau ${idleDays} ngày. Duyệt = gửi email nhắc lịch sự (đã soạn sẵn).`
      : `Hồ sơ không có hoạt động ${idleDays} ngày ở bước "${stageLabel}". Duyệt = nhắc những người phụ trách qua thông báo.`,
    payload: {
      action: waitingOnCandidate ? "remind_candidate" : "remind_team",
      stage,
      idle_days: idleDays,
      ...(waitingOnCandidate && candidate.email
        ? {
            email: {
              to: candidate.email,
              subject: `Mắt Việt — nhắc về quy trình tuyển dụng vị trí ${job.title}`,
              body_html:
                `<p>Kính gửi ${candidate.full_name},</p>` +
                (stage === "offer_sent"
                  ? `<p>Mắt Việt đã gửi thư mời nhận việc cho vị trí <strong>${job.title}</strong> và rất mong nhận được phản hồi của bạn. Nếu bạn cần thêm thời gian hoặc có câu hỏi, xin cứ trả lời email này.</p>`
                  : `<p>Mắt Việt đã gửi bài kiểm tra cho vị trí <strong>${job.title}</strong> và chưa nhận được bài làm của bạn. Nếu link đã hết hạn hoặc bạn cần hỗ trợ, xin trả lời email này.</p>`) +
                `<p>Trân trọng,<br/>Phòng Nhân sự Mắt Việt</p>`,
            },
          }
        : {}),
    },
    dedupeKey: `ns:${candidate.id}:${stage}`,
  });
}

/** Human-readable slot line for cards/emails ("Thứ Năm 17/07 14:00"). */
export function formatSlotVi(iso: string): string {
  return formatDateTime(iso);
}
