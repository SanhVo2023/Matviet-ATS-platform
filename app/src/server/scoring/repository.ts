import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/db";
import { CRITERION_CODES, type CriterionCode, type Weights } from "@/lib/ai/gemini/types";
import { computeWeightedTotal, readWeights } from "./weights";

export type AiScreeningRow = Tables<"ai_screenings">;
export type ScoringQueueRow = Tables<"scoring_queue">;

type CandidateUpdate = TablesUpdate<"candidates">;
type ScoringQueueInsert = TablesInsert<"scoring_queue">;
type AiScreeningInsert = TablesInsert<"ai_screenings">;

/**
 * Idempotent enqueue. Inserts a queue row if no live (queued/running) row
 * exists for this candidate, then flips candidates.ai_screening_status='pending'
 * and current_stage='screening' if the candidate is still 'new'.
 *
 * Uses the admin client so the edge function and server actions both succeed
 * regardless of the caller's role; the caller MUST have already passed
 * requireRole(['admin','hr']).
 */
export async function enqueueScoring(
  candidateId: string,
  triggeredBy: string,
): Promise<{ queue_id: string; created: boolean }> {
  const admin = createAdminClient();

  // 1. Check for live job
  const { data: existing } = await admin
    .from("scoring_queue")
    .select("id, status")
    .eq("candidate_id", candidateId)
    .in("status", ["queued", "running"])
    .order("enqueued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { queue_id: (existing as { id: string }).id, created: false };
  }

  // 2. Insert new queue row
  const insertPayload: ScoringQueueInsert = {
    candidate_id: candidateId,
    status: "queued",
    triggered_by: triggeredBy,
  };
  const { data: inserted, error: insertErr } = await admin
    .from("scoring_queue")
    .insert(insertPayload as never)
    .select("id")
    .single();
  if (insertErr || !inserted) throw insertErr ?? new Error("Không thể đẩy vào queue chấm điểm");

  // 3. Flip candidate status flags. Stage flips only if currently 'new'.
  const candUpdate: CandidateUpdate = {
    ai_screening_status: "pending",
    ai_screening_error: null,
  };
  const { error: candErr } = await admin
    .from("candidates")
    .update(candUpdate as never)
    .eq("id", candidateId);
  if (candErr) throw candErr;

  // Bump stage 'new' → 'screening' (separate update so the trigger fires once)
  await admin
    .from("candidates")
    .update({ current_stage: "screening" } as never)
    .eq("id", candidateId)
    .eq("current_stage", "new");

  return { queue_id: (inserted as { id: string }).id, created: true };
}

/** RLS-aware. Returns null if there are no screenings yet. */
export async function getLatestScreening(candidateId: string): Promise<AiScreeningRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_screenings")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as AiScreeningRow | null;
}

/** RLS-aware lookup of the latest queue row (for status pill / spinner). */
export async function getQueueStatus(candidateId: string): Promise<{
  status: ScoringQueueRow["status"];
  attempts: number;
  last_error: string | null;
  enqueued_at: string;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scoring_queue")
    .select("status, attempts, last_error, enqueued_at")
    .eq("candidate_id", candidateId)
    .order("enqueued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as {
    status: ScoringQueueRow["status"];
    attempts: number;
    last_error: string | null;
    enqueued_at: string;
  } | null;
}

/**
 * HR-side manual scoring fallback. Writes an ai_screenings row with model='manual';
 * the bump_candidate_score trigger denormalizes ai_score on candidates.
 */
export async function recordManualScore(args: {
  candidateId: string;
  scores: Record<CriterionCode, number>;
  weights: Weights;
  actorId: string;
  reasoning?: string;
}): Promise<{ screening_id: string }> {
  const admin = createAdminClient();

  const criteriaJson = Object.fromEntries(
    CRITERION_CODES.map((k) => [
      k,
      {
        score: args.scores[k] ?? 0,
        reasoning: args.reasoning ?? "Chấm thủ công bởi HR.",
        evidence_quotes: [],
      },
    ]),
  );
  const totalNum = computeWeightedTotal(
    Object.fromEntries(CRITERION_CODES.map((k) => [k, { score: args.scores[k] ?? 0 }])) as Record<
      CriterionCode,
      { score: number }
    >,
    args.weights,
  );

  const insertPayload: AiScreeningInsert = {
    candidate_id: args.candidateId,
    model: "manual",
    criteria: criteriaJson,
    weights_snapshot: args.weights,
    total: totalNum,
    pass1_raw: null,
    pass2_raw: null,
    cost_usd: 0,
    tokens_in: 0,
    tokens_out: 0,
    duration_ms: 0,
    error: null,
  };
  const { data, error } = await admin
    .from("ai_screenings")
    .insert(insertPayload as never)
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Không thể lưu điểm thủ công");

  // Mark queue rows as cancelled so the worker doesn't pick them up later
  await admin
    .from("scoring_queue")
    .update({ status: "cancelled", completed_at: new Date().toISOString() } as never)
    .eq("candidate_id", args.candidateId)
    .in("status", ["queued", "running", "failed"]);

  return { screening_id: (data as { id: string }).id };
}

/**
 * Pure-SQL re-aggregation when a job's weights change. Calls the helper
 * function added in migration 0014. Returns count of candidates updated.
 */
export async function reaggregateScoresForJob(jobId: string, newWeights: Weights): Promise<number> {
  if (!jobId) return 0;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reaggregate_job_scores", {
    _job_id: jobId,
    _new_weights: newWeights as never,
  });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

/** Used by the cron drain to find queued + retry-due rows. */
export async function listDrainableQueueRows(limit = 10): Promise<ScoringQueueRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("scoring_queue")
    .select("*")
    .or(`status.eq.queued,and(status.eq.failed,next_retry_at.lte.${new Date().toISOString()})`)
    .order("enqueued_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ScoringQueueRow[];
}

/**
 * Re-export weights helper for callers that already have a Job row in hand.
 */
export function jobWeights(jobWeightsJson: unknown): Weights {
  return readWeights(jobWeightsJson);
}
