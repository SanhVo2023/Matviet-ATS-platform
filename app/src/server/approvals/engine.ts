import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, TablesInsert, TablesUpdate } from "@/types/db";
import { APPROVAL_PRESETS, STAGE_FOR_PENDING_STEP, type FlowType } from "./presets";

type ApprovalInsert = TablesInsert<"approvals">;
type ApprovalUpdate = TablesUpdate<"approvals">;
type CandidateUpdate = TablesUpdate<"candidates">;
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
  const supabase = await createClient();
  const admin = createAdminClient();

  // Already started?
  const { data: existing } = await supabase
    .from("approvals")
    .select("id")
    .eq("candidate_id", candidateId)
    .order("step_index");
  if (existing && existing.length > 0) {
    return {
      approval_ids: (existing as { id: string }[]).map((r) => r.id),
      first_step_kind: APPROVAL_PRESETS["staff"][0]!, // placeholder; UI uses repository.listApprovalsForCandidate to render
    };
  }

  // Look up job to determine flow_type
  const { data: cand, error: cErr } = await supabase
    .from("candidates")
    .select("id, job_id")
    .eq("id", candidateId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!cand) throw new Error("Không tìm thấy ứng viên");

  const { data: job, error: jErr } = await supabase
    .from("jobs")
    .select("flow_type")
    .eq("id", (cand as { job_id: string }).job_id)
    .maybeSingle();
  if (jErr) throw jErr;
  if (!job) throw new Error("Không tìm thấy tin tuyển dụng");

  const flow = (job as { flow_type: FlowType }).flow_type;
  const steps = APPROVAL_PRESETS[flow];

  const rows: ApprovalInsert[] = steps.map((step, idx) => ({
    candidate_id: candidateId,
    step_index: idx,
    step_kind: step,
    status: "pending",
  }));

  const { data: ins, error: insErr } = await admin
    .from("approvals")
    .insert(rows as never)
    .select("id");
  if (insErr || !ins) throw insErr ?? new Error("Không tạo được quy trình duyệt");

  // Bump stage to whatever the first pending step implies
  const firstStep = steps[0]!;
  const targetStage = STAGE_FOR_PENDING_STEP[firstStep];
  const candUpdate: CandidateUpdate = { current_stage: targetStage };
  await supabase
    .from("candidates")
    .update(candUpdate as never)
    .eq("id", candidateId);

  return {
    approval_ids: (ins as { id: string }[]).map((r) => r.id),
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
  const supabase = await createClient();
  const admin = createAdminClient();

  // Fetch the approval + sibling rows for this candidate
  const { data: row, error: rErr } = await supabase
    .from("approvals")
    .select("*")
    .eq("id", approvalId)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!row) throw new Error("Không tìm thấy bước duyệt");
  const r = row as Tables_Approvals;
  if (r.status !== "pending") throw new Error("Bước này đã được xử lý");

  // 1. Update this row to the decision
  const update: ApprovalUpdate = {
    status: decision,
    actor_user_id: actorId,
    decided_at: new Date().toISOString(),
    notes: notes?.trim() || null,
  };
  const { error: uErr } = await admin
    .from("approvals")
    .update(update as never)
    .eq("id", approvalId);
  if (uErr) throw uErr;

  // 2. Resolve next state of the candidate
  if (decision === "rejected") {
    const cu: CandidateUpdate = { current_stage: "rejected" };
    await supabase
      .from("candidates")
      .update(cu as never)
      .eq("id", r.candidate_id);
    return { candidateId: r.candidate_id, finalized: true, nextStep: null };
  }

  // Approved — find next pending row by step_index
  const { data: siblings } = await supabase
    .from("approvals")
    .select("step_kind, step_index, status")
    .eq("candidate_id", r.candidate_id)
    .order("step_index", { ascending: true });
  const next = (siblings ?? [])
    .map((s) => s as { step_kind: StepKind; step_index: number; status: string })
    .find((s) => s.status === "pending");

  if (!next) {
    // Fully approved — fire offer
    const cu: CandidateUpdate = { current_stage: "offer_sent" };
    await supabase
      .from("candidates")
      .update(cu as never)
      .eq("id", r.candidate_id);
    return { candidateId: r.candidate_id, finalized: true, nextStep: null };
  }

  // Move stage to whatever the next pending step implies
  const targetStage = STAGE_FOR_PENDING_STEP[next.step_kind];
  const cu: CandidateUpdate = { current_stage: targetStage };
  await supabase
    .from("candidates")
    .update(cu as never)
    .eq("id", r.candidate_id);
  return { candidateId: r.candidate_id, finalized: false, nextStep: next.step_kind };
}

// Local alias to keep the engine self-contained without importing from repository
type Tables_Approvals = {
  id: string;
  candidate_id: string;
  step_index: number;
  step_kind: StepKind;
  status: "pending" | "approved" | "rejected";
  actor_user_id: string | null;
  decided_at: string | null;
  notes: string | null;
};
