import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { approvals, candidates, jobs } from "@/db/schema";
import type { Database } from "@/types/db";
import { APPROVAL_PRESETS, STAGE_FOR_PENDING_STEP, type FlowType } from "./presets";

type StepKind = Database["public"]["Enums"]["approval_step_kind"];

/**
 * Kick off the approval flow for a candidate. Reads job.flow_type to pick
 * the preset, creates one row per step (all 'pending' initially), and bumps
 * the candidate's stage to reflect the first pending step.
 *
 * Idempotent: if rows already exist for this candidate, returns the existing
 * approval id of the lowest-step-pending row.
 */
export async function startApproval(
  candidateId: string,
): Promise<{ approval_ids: string[]; first_step_kind: StepKind }> {
  const db = await getDb();

  // Already started?
  const existing = await db
    .select({ id: approvals.id })
    .from(approvals)
    .where(eq(approvals.candidate_id, candidateId))
    .orderBy(asc(approvals.step_index));
  if (existing.length > 0) {
    return {
      approval_ids: existing.map((r) => r.id),
      first_step_kind: APPROVAL_PRESETS["staff"][0]!, // placeholder; UI uses repository.listApprovalsForCandidate to render
    };
  }

  // Look up job to determine flow_type
  const cand = await db
    .select({ id: candidates.id, job_id: candidates.job_id })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!cand) throw new Error("Không tìm thấy ứng viên");

  const job = await db
    .select({ flow_type: jobs.flow_type })
    .from(jobs)
    .where(eq(jobs.id, cand.job_id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!job) throw new Error("Không tìm thấy tin tuyển dụng");

  const flow = job.flow_type as FlowType;
  const steps = APPROVAL_PRESETS[flow];

  const rows = steps.map((step, idx) => ({
    candidate_id: candidateId,
    step_index: idx,
    step_kind: step,
    status: "pending" as const,
  }));

  const ins = await db.insert(approvals).values(rows).returning({ id: approvals.id });
  if (ins.length === 0) throw new Error("Không tạo được quy trình duyệt");

  // Bump stage to whatever the first pending step implies
  const firstStep = steps[0]!;
  const targetStage = STAGE_FOR_PENDING_STEP[firstStep];
  await db
    .update(candidates)
    .set({ current_stage: targetStage })
    .where(eq(candidates.id, candidateId));

  return {
    approval_ids: ins.map((r) => r.id),
    first_step_kind: firstStep,
  };
}

/**
 * Record a decision on a single step. Advances the candidate's stage to
 * reflect the next pending step, OR finalizes (offer_sent on full approve,
 * rejected on first reject).
 */
export async function decideApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  actorId: string,
  notes?: string,
): Promise<{ candidateId: string; finalized: boolean; nextStep: StepKind | null }> {
  const db = await getDb();

  // Fetch the approval row
  const r = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, approvalId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!r) throw new Error("Không tìm thấy bước duyệt");
  if (r.status !== "pending") throw new Error("Bước này đã được xử lý");

  // 1. Update this row to the decision
  await db
    .update(approvals)
    .set({
      status: decision,
      actor_user_id: actorId,
      decided_at: new Date().toISOString(),
      notes: notes?.trim() || null,
    })
    .where(eq(approvals.id, approvalId));

  // 2. Resolve next state of the candidate
  if (decision === "rejected") {
    await db
      .update(candidates)
      .set({ current_stage: "rejected" })
      .where(eq(candidates.id, r.candidate_id));
    return { candidateId: r.candidate_id, finalized: true, nextStep: null };
  }

  // Approved — find next pending row by step_index
  const siblings = await db
    .select({
      step_kind: approvals.step_kind,
      step_index: approvals.step_index,
      status: approvals.status,
    })
    .from(approvals)
    .where(eq(approvals.candidate_id, r.candidate_id))
    .orderBy(asc(approvals.step_index));
  const next = siblings.find((s) => s.status === "pending");

  if (!next) {
    // Fully approved — fire offer
    await db
      .update(candidates)
      .set({ current_stage: "offer_sent" })
      .where(eq(candidates.id, r.candidate_id));
    return { candidateId: r.candidate_id, finalized: true, nextStep: null };
  }

  // Move stage to whatever the next pending step implies
  const targetStage = STAGE_FOR_PENDING_STEP[next.step_kind];
  await db
    .update(candidates)
    .set({ current_stage: targetStage })
    .where(eq(candidates.id, r.candidate_id));
  return { candidateId: r.candidate_id, finalized: false, nextStep: next.step_kind };
}
