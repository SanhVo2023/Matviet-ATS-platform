import "server-only";
import { getDb } from "@/db";
import { audit_log } from "@/db/schema";
import { scheduleInterview } from "@/server/interviews/service";
import { startApproval } from "@/server/approvals/engine";
import { composeFromTemplate, composeAdHoc } from "@/server/email/service";
import { getComposerVarDefaults } from "@/server/email/composer-defaults";
import { notifyRoles, notifyUsers, jobManagerIds } from "@/server/notifications/service";
import { ScheduleInterviewSchema } from "@/lib/validation/interview";
import { getCandidate } from "@/server/candidates/repository";
import { claimProposal, getProposal, markProposalOutcome, type ProposalRow } from "./repository";
import type { InterviewInvitePayload } from "./generators";

/**
 * Proposal execution (ADR 0020) — the approve tap. Every kind executes
 * through the SAME server services a manual click uses today; the proposal
 * only carried the prepared inputs. Audit-logged as via:'agent_proposal'.
 */

export interface ExecuteActor {
  id: string;
  name: string;
}

export interface ExecuteOptions {
  /** interview_invite: which proposed slot to book (default 0). */
  slotIndex?: number;
}

export type ExecuteResult =
  | { ok: true; executedRef: Record<string, string>; message: string }
  | { ok: false; error: string };

export async function executeProposal(
  id: string,
  actor: ExecuteActor,
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const proposal = await getProposal(id);
  if (!proposal) return { ok: false, error: "Không tìm thấy đề xuất" };
  // Atomic claim (proposed → approved): blocks double-taps AND stops a
  // concurrent reconcile from superseding the row mid-execution (the
  // schedule emitter's own stage_changed event races this function).
  if (!(await claimProposal(id, actor.id))) {
    return { ok: false, error: "Đề xuất này đã được xử lý" };
  }

  let result: ExecuteResult;
  try {
    result = await executeByKind(proposal, actor, options);
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : "Thực hiện thất bại" };
  }

  await markProposalOutcome(
    id,
    actor.id,
    result.ok
      ? { status: "executed", executedRef: result.executedRef }
      : { status: "failed", error: result.error },
  );
  await audit(actor, proposal, result);
  return result;
}

async function executeByKind(
  p: ProposalRow,
  actor: ExecuteActor,
  options: ExecuteOptions,
): Promise<ExecuteResult> {
  switch (p.kind) {
    case "interview_invite":
      return executeInterviewInvite(p, actor, options);
    case "start_approval": {
      if (!p.candidate_id) return { ok: false, error: "Thiếu ứng viên" };
      const r = await startApproval(p.candidate_id);
      return {
        ok: true,
        executedRef: { approval_id: r.approval_ids[0] ?? "" },
        message: r.already_started
          ? "Quy trình duyệt đã tồn tại"
          : "Đã tạo quy trình duyệt và thông báo người duyệt đầu tiên",
      };
    }
    case "compose_offer": {
      // The offer needs salary/start-date judgment → the card's primary
      // action opens the composer (offer template preselected). This path
      // runs AFTER the composer queued the email, closing the card.
      if (!p.candidate_id) return { ok: false, error: "Thiếu ứng viên" };
      const { hasOfferEmail } = await import("./generators");
      if (!(await hasOfferEmail(p.candidate_id))) {
        return { ok: false, error: "Chưa có thư offer trong hàng đợi — dùng nút Soạn thư" };
      }
      return { ok: true, executedRef: {}, message: "Thư offer đã vào hàng đợi gửi" };
    }
    case "nudge_stale":
      return executeNudge(p, actor);
    case "job_from_intent": {
      const { executeJobFromIntent } = await import("./job-from-intent");
      return executeJobFromIntent(p, actor);
    }
    default:
      return { ok: false, error: `Loại đề xuất chưa hỗ trợ: ${p.kind}` };
  }
}

async function executeInterviewInvite(
  p: ProposalRow,
  actor: ExecuteActor,
  options: ExecuteOptions,
): Promise<ExecuteResult> {
  if (!p.candidate_id) return { ok: false, error: "Thiếu ứng viên" };
  const payload = p.payload as unknown as InterviewInvitePayload;
  const slot = payload.slots[options.slotIndex ?? 0];
  if (!slot) return { ok: false, error: "Khung giờ không hợp lệ" };

  // Slots were computed at proposal time; an old card can hold past times.
  // Refresh instead of failing into a raw validation error: this proposal
  // gets marked failed (which doesn't block dedupe) and a fresh card with
  // new slots replaces it.
  if (Date.parse(slot.start) <= Date.now()) {
    const { getJob } = await import("@/server/jobs/repository");
    const { getCandidate: getCand } = await import("@/server/candidates/repository");
    const [job, cand] = await Promise.all([getJob(p.job_id ?? ""), getCand(p.candidate_id)]);
    if (job && cand) {
      const { proposeInterviewInvite } = await import("./generators");
      await proposeInterviewInvite({
        candidate: {
          id: cand.id,
          job_id: cand.job_id,
          full_name: cand.full_name,
          ai_score: cand.ai_score,
        },
        job: { id: job.id, title: job.title, flow_type: job.flow_type },
      });
    }
    return {
      ok: false,
      error: "Khung giờ đề xuất đã qua — trợ lý vừa tạo thẻ mới với khung giờ cập nhật.",
    };
  }

  // A schedule needs ≥1 interviewer; jobs without assigned managers fall
  // back to the approving HR user.
  const attendeeIds = payload.attendee_ids.length > 0 ? payload.attendee_ids : [actor.id];

  const input = ScheduleInterviewSchema.parse({
    candidate_id: p.candidate_id,
    scheduled_at: slot.start,
    duration_min: payload.duration_min,
    type: payload.type,
    attendee_ids: attendeeIds,
  });
  const { id: interviewId } = await scheduleInterview(input, actor.id);

  // Ambient AI (ADR 0018) — same background question generation the manual
  // schedule action fires.
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { ctx } = await getCloudflareContext({ async: true });
    const { generateAndPersistInterviewQuestions } =
      await import("@/server/interviews/ai-questions");
    ctx.waitUntil(
      generateAndPersistInterviewQuestions(interviewId).catch((err) =>
        console.warn("[agent-flows] question generation failed:", err),
      ),
    );
  } catch (bgErr) {
    console.warn("[agent-flows] could not schedule question generation:", bgErr);
  }

  // Invite email — vars auto-resolved now that the interview exists.
  const candidate = await getCandidate(p.candidate_id);
  const refs: Record<string, string> = { interview_id: interviewId };
  let message = "Đã đặt lịch phỏng vấn";
  if (candidate?.email) {
    const vars = await getComposerVarDefaults(p.candidate_id, actor.name);
    const { id: emailId } = await composeFromTemplate({
      templateCode: "interview_invite",
      to: [candidate.email],
      vars,
      candidateId: p.candidate_id,
      jobId: p.job_id,
      interviewId,
      // The proposal approval IS the human sign-off for this send.
      forceImmediate: true,
      createdBy: actor.id,
    });
    refs.email_id = emailId;
    message = "Đã đặt lịch phỏng vấn + xếp thư mời vào hàng đợi gửi";
  } else {
    message = "Đã đặt lịch phỏng vấn (ứng viên chưa có email — không gửi được thư mời)";
  }
  return { ok: true, executedRef: refs, message };
}

async function executeNudge(p: ProposalRow, actor: ExecuteActor): Promise<ExecuteResult> {
  const payload = p.payload as {
    action?: string;
    stage?: string;
    email?: { to: string; subject: string; body_html: string };
  };
  if (payload.action === "remind_candidate" && payload.email) {
    const { id: emailId } = await composeAdHoc({
      to: [payload.email.to],
      subject: payload.email.subject,
      bodyHtml: payload.email.body_html,
      candidateId: p.candidate_id,
      jobId: p.job_id,
      requiresApproval: false,
      createdBy: actor.id,
    });
    return {
      ok: true,
      executedRef: { email_id: emailId },
      message: "Đã xếp email nhắc ứng viên vào hàng đợi gửi",
    };
  }
  // Internal nudge: bell the job's managers + HR (minus the approver).
  const payloadNotif = {
    type: "system" as const,
    title: `Cần xử lý: ${p.candidate_name ?? "ứng viên"}`,
    body: p.summary,
    link: p.candidate_id ? `/ung-vien/${p.candidate_id}` : "/",
  };
  if (p.job_id) {
    await notifyUsers(await jobManagerIds(p.job_id), payloadNotif, { excludeUserId: actor.id });
  }
  await notifyRoles(["hr", "admin"], payloadNotif, { excludeUserId: actor.id });
  return { ok: true, executedRef: {}, message: "Đã nhắc những người phụ trách" };
}

async function audit(actor: ExecuteActor, p: ProposalRow, result: ExecuteResult): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(audit_log).values({
      entity: "agent_proposal",
      entity_id: p.id,
      action: result.ok ? "execute" : "execute_failed",
      actor_user_id: actor.id,
      after: {
        kind: p.kind,
        candidate_id: p.candidate_id,
        ...(result.ok ? { ref: result.executedRef } : { error: result.error }),
      } as never,
      meta: { via: "agent_proposal" } as never,
    });
  } catch (err) {
    console.warn("[agent-flows] audit write failed:", err);
  }
}
