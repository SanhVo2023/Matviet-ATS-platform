import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  approvals,
  candidates,
  cv_markdowns,
  interview_evaluations,
  interviews,
  jobs,
  stage_history,
} from "@/db/schema";
import { lookupProfileNames } from "@/server/candidates/repository";
import { listSubmissionsForCandidate } from "@/server/assessments/repository";
import { STEP_LABEL_VI } from "@/server/approvals/presets";
import { t } from "@/lib/i18n";
import { formatDateTime, formatVND } from "@/lib/vi-format";

/**
 * Candidate dossier (ADR 0017) — the "living Markdown" of a candidate,
 * assembled FRESH on every call from the structured source of truth:
 * CV markdown cache + HR notes + interview evaluations + approval chain
 * (incl. salary) + stage history + offer response. It is deliberately a
 * VIEW, not a stored document — edits to any underlying record are always
 * reflected, and there is no second source of truth to drift.
 *
 * Consumers: the AI agent (`get_candidate_dossier` tool), AI summary,
 * interview-question generation, and a future "tải hồ sơ .md" button.
 */
export async function buildCandidateDossier(
  candidateId: string,
  opts?: { maxCvChars?: number },
): Promise<string | null> {
  const db = await getDb();

  const cand = await db.select().from(candidates).where(eq(candidates.id, candidateId)).get();
  if (!cand) return null;

  const [job, cvMdRow, history, ivRows, approvalRows, submissions] = await Promise.all([
    db.select({ title: jobs.title }).from(jobs).where(eq(jobs.id, cand.job_id)).get(),
    cand.cv_file_id
      ? db
          .select({ md: cv_markdowns.md, status: cv_markdowns.status })
          .from(cv_markdowns)
          .where(eq(cv_markdowns.cv_file_id, cand.cv_file_id))
          .get()
      : Promise.resolve(undefined),
    db
      .select()
      .from(stage_history)
      .where(eq(stage_history.candidate_id, candidateId))
      .orderBy(asc(stage_history.at)),
    db
      .select({
        scheduled_at: interviews.scheduled_at,
        type: interviews.type,
        status: interviews.status,
        evaluator_user_id: interview_evaluations.evaluator_user_id,
        recommendation: interview_evaluations.recommendation,
        strengths: interview_evaluations.strengths,
        concerns: interview_evaluations.concerns,
        proposed_salary: interview_evaluations.proposed_salary,
        internal_notes: interview_evaluations.internal_notes,
      })
      .from(interviews)
      .leftJoin(interview_evaluations, eq(interview_evaluations.interview_id, interviews.id))
      .where(eq(interviews.candidate_id, candidateId))
      .orderBy(asc(interviews.scheduled_at)),
    db
      .select()
      .from(approvals)
      .where(eq(approvals.candidate_id, candidateId))
      .orderBy(asc(approvals.step_index)),
    listSubmissionsForCandidate(candidateId),
  ]);

  // Resolve actor names in one lookup
  const actorIds = new Set<string>();
  for (const h of history) if (h.actor_user_id) actorIds.add(h.actor_user_id);
  for (const iv of ivRows) if (iv.evaluator_user_id) actorIds.add(iv.evaluator_user_id);
  for (const a of approvalRows) if (a.actor_user_id) actorIds.add(a.actor_user_id);
  const names = await lookupProfileNames([...actorIds]);
  const nameOf = (id: string | null) => (id ? (names[id] ?? "—") : "—");

  const L: string[] = [];
  L.push(`# Hồ sơ ứng viên: ${cand.full_name}`);
  L.push("");
  L.push(`- **Vị trí ứng tuyển:** ${job?.title ?? "—"}`);
  L.push(`- **Giai đoạn hiện tại:** ${t.stage[cand.current_stage]}`);
  L.push(`- **Điểm AI:** ${cand.ai_score != null ? Math.round(cand.ai_score) : "chưa chấm"}`);
  L.push(`- **Email:** ${cand.email ?? "—"} · **SĐT:** ${cand.phone ?? "—"}`);
  L.push(`- **Nguồn:** ${t.source[cand.source]} · **Nộp:** ${formatDateTime(cand.created_at)}`);
  if (cand.expected_start_date) L.push(`- **Ngày nhận việc dự kiến:** ${cand.expected_start_date}`);
  if (cand.offer_response) {
    L.push(
      `- **Phản hồi offer:** ${cand.offer_response === "accepted" ? "ĐỒNG Ý" : "TỪ CHỐI"}` +
        (cand.offer_responded_at ? ` (${formatDateTime(cand.offer_responded_at)})` : "") +
        (cand.offer_response_note ? ` — ${cand.offer_response_note}` : ""),
    );
  }

  // HR notes — candidates.notes is already a timestamped append-log
  if (cand.notes?.trim()) {
    L.push("", "## Ghi chú của HR", "", cand.notes.trim());
  }

  // Interview evaluations
  const evals = ivRows.filter((r) => r.evaluator_user_id);
  if (evals.length > 0) {
    L.push("", "## Đánh giá phỏng vấn");
    for (const e of evals) {
      L.push("", `### ${formatDateTime(e.scheduled_at)} — ${nameOf(e.evaluator_user_id)}`);
      if (e.recommendation) L.push(`- **Khuyến nghị:** ${t.recommendation[e.recommendation]}`);
      if (e.proposed_salary != null) L.push(`- **Đề xuất lương:** ${formatVND(e.proposed_salary)}`);
      if (e.strengths?.trim()) L.push(`- **Điểm mạnh:** ${e.strengths.trim()}`);
      if (e.concerns?.trim()) L.push(`- **Băn khoăn:** ${e.concerns.trim()}`);
      if (e.internal_notes?.trim()) L.push(`- **Ghi chú nội bộ:** ${e.internal_notes.trim()}`);
    }
  }

  // Assessment (bài test)
  const graded = submissions.filter((s) => s.score != null);
  if (graded.length > 0) {
    L.push("", "## Bài test");
    for (const s of graded) {
      L.push(
        `- Điểm: **${s.score}**${s.submitted_at ? ` (nộp ${formatDateTime(s.submitted_at)})` : ""}`,
      );
    }
  }

  // Approval chain (incl. salary note from HR deal steps)
  if (approvalRows.length > 0) {
    L.push("", "## Chuỗi phê duyệt");
    for (const a of approvalRows) {
      const label = STEP_LABEL_VI[a.step_kind] ?? a.step_kind;
      const status =
        a.status === "approved" ? "✅ Đã duyệt" : a.status === "rejected" ? "❌ Từ chối" : "⏳ Chờ";
      L.push(
        `- **${label}:** ${status}` +
          (a.actor_user_id ? ` — ${nameOf(a.actor_user_id)}` : "") +
          (a.decided_at ? ` (${formatDateTime(a.decided_at)})` : "") +
          (a.notes?.trim() ? ` — ${a.notes.trim()}` : ""),
      );
    }
  }

  // Stage history (compact)
  if (history.length > 0) {
    L.push("", "## Lịch sử giai đoạn");
    for (const h of history) {
      L.push(
        `- ${formatDateTime(h.at)}: ${h.from_stage ? `${t.stage[h.from_stage]} → ` : ""}${t.stage[h.to_stage]}` +
          (h.actor_user_id ? ` (${nameOf(h.actor_user_id)})` : "") +
          (h.notes?.trim() ? ` — ${h.notes.trim()}` : ""),
      );
    }
  }

  // CV content — the cached markdown (never the PDF; ADR 0017)
  const cvMd = (cvMdRow?.status === "done" ? cvMdRow.md : null) ?? cand.cv_text ?? null;
  if (cvMd?.trim()) {
    const cap = opts?.maxCvChars ?? 20_000;
    L.push("", "## Nội dung CV", "", cvMd.trim().slice(0, cap));
  }

  return L.join("\n");
}
