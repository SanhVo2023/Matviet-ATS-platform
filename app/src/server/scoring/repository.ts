import "server-only";
import { and, desc, eq, inArray, lte, or, asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { ai_screenings, candidates, scoring_queue, stage_history } from "@/db/schema";
import type { Tables, TablesInsert } from "@/types/db";
import { CRITERION_CODES, type CriterionCode, type Weights } from "@/lib/ai/gemini/types";
import { computeWeightedTotal, readWeights } from "./weights";

export type AiScreeningRow = Tables<"ai_screenings">;
export type ScoringQueueRow = Tables<"scoring_queue">;

type AiScreeningInsert = TablesInsert<"ai_screenings">;

/**
 * Idempotent enqueue. Inserts a queue row if no live (queued/running) row
 * exists for this candidate, then flips candidates.ai_screening_status='pending'
 * and current_stage='screening' if the candidate is still 'new'.
 *
 * The caller MUST have already passed requireRole(['admin','hr']) —
 * authorization lives in the action layer (single-principal D1, ADR 0011).
 */
export async function enqueueScoring(
  candidateId: string,
  triggeredBy: string | null,
): Promise<{ queue_id: string; created: boolean }> {
  const db = await getDb();

  // 1. Check for live job
  const existing = await db
    .select({ id: scoring_queue.id, status: scoring_queue.status })
    .from(scoring_queue)
    .where(
      and(
        eq(scoring_queue.candidate_id, candidateId),
        inArray(scoring_queue.status, ["queued", "running"]),
      ),
    )
    .orderBy(desc(scoring_queue.enqueued_at))
    .limit(1);
  if (existing[0]) {
    return { queue_id: existing[0].id, created: false };
  }

  // 2. Insert new queue row
  const inserted = await db
    .insert(scoring_queue)
    .values({ candidate_id: candidateId, status: "queued", triggered_by: triggeredBy })
    .returning({ id: scoring_queue.id });
  const queueId = inserted[0]?.id;
  if (!queueId) throw new Error("Không thể đẩy vào queue chấm điểm");

  // 3. Flip candidate status flags. Stage flips only if currently 'new'.
  await db
    .update(candidates)
    .set({ ai_screening_status: "pending", ai_screening_error: null })
    .where(eq(candidates.id, candidateId));

  // Bump stage 'new' → 'screening'. D1 has no triggers, so we mirror the old
  // log_stage_change trigger here: write the stage_history row ourselves when
  // (and only when) the stage actually flipped.
  const bumped = await db
    .update(candidates)
    .set({ current_stage: "screening" })
    .where(and(eq(candidates.id, candidateId), eq(candidates.current_stage, "new")))
    .returning({ id: candidates.id });
  if (bumped.length > 0) {
    await db.insert(stage_history).values({
      candidate_id: candidateId,
      from_stage: "new",
      to_stage: "screening",
      actor_user_id: triggeredBy,
    });
  }

  return { queue_id: queueId, created: true };
}

/** Returns null if there are no screenings yet. */
export async function getLatestScreening(candidateId: string): Promise<AiScreeningRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(ai_screenings)
    .where(eq(ai_screenings.candidate_id, candidateId))
    .orderBy(desc(ai_screenings.created_at))
    .limit(1);
  return rows[0] ?? null;
}

/** Lookup of the latest queue row (for status pill / spinner). */
export async function getQueueStatus(candidateId: string): Promise<{
  status: ScoringQueueRow["status"];
  attempts: number;
  last_error: string | null;
  enqueued_at: string;
} | null> {
  const db = await getDb();
  const rows = await db
    .select({
      status: scoring_queue.status,
      attempts: scoring_queue.attempts,
      last_error: scoring_queue.last_error,
      enqueued_at: scoring_queue.enqueued_at,
    })
    .from(scoring_queue)
    .where(eq(scoring_queue.candidate_id, candidateId))
    .orderBy(desc(scoring_queue.enqueued_at))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * HR-side manual scoring fallback. Writes an ai_screenings row with model='manual'
 * and denormalizes ai_score onto candidates in the same atomic batch (the old
 * bump_candidate_score Postgres trigger — migration 0014 — no longer exists on D1).
 */
export async function recordManualScore(args: {
  candidateId: string;
  scores: Record<CriterionCode, number>;
  weights: Weights;
  actorId: string;
  reasoning?: string;
}): Promise<{ screening_id: string }> {
  const db = await getDb();

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

  // Pre-generate id + created_at so the insert, the candidates denorm and the
  // queue cancellation can go through one atomic D1 batch.
  const screeningId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const insertPayload: AiScreeningInsert = {
    id: screeningId,
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
    created_at: nowIso,
  };

  await db.batch([
    db.insert(ai_screenings).values(insertPayload),
    // Mirror of the old bump_candidate_score trigger (0014 version).
    db
      .update(candidates)
      .set({
        ai_score: totalNum,
        ai_breakdown: criteriaJson,
        ai_screening_status: "success",
        ai_screening_error: null,
        ai_scored_at: nowIso,
      })
      .where(eq(candidates.id, args.candidateId)),
    // Mark queue rows as cancelled so the worker doesn't pick them up later.
    db
      .update(scoring_queue)
      .set({ status: "cancelled", completed_at: nowIso })
      .where(
        and(
          eq(scoring_queue.candidate_id, args.candidateId),
          inArray(scoring_queue.status, ["queued", "running", "failed"]),
        ),
      ),
  ]);

  return { screening_id: screeningId };
}

/** Coerce a criteria json blob into the {score} map computeWeightedTotal expects. */
function readCriteriaScores(criteria: unknown): Record<CriterionCode, { score: number }> {
  const obj = (criteria && typeof criteria === "object" ? criteria : {}) as Record<
    string,
    { score?: unknown } | undefined
  >;
  return Object.fromEntries(
    CRITERION_CODES.map((k) => {
      const raw = obj[k]?.score;
      return [k, { score: typeof raw === "number" && Number.isFinite(raw) ? raw : 0 }];
    }),
  ) as Record<CriterionCode, { score: number }>;
}

/**
 * Re-aggregation when a job's weights change — TypeScript port of the old
 * `reaggregate_job_scores` Postgres function (migrations 0014/0015). For each
 * non-archived candidate of the job that has at least one screening, recompute
 * the weighted total from the LATEST screening's criteria using the new weights
 * (no Gemini calls). Returns count of candidates updated.
 */
export async function reaggregateScoresForJob(jobId: string, newWeights: Weights): Promise<number> {
  if (!jobId) return 0;
  const db = await getDb();

  const rows = await db
    .select({
      candidate_id: candidates.id,
      criteria: ai_screenings.criteria,
      created_at: ai_screenings.created_at,
    })
    .from(candidates)
    .innerJoin(ai_screenings, eq(ai_screenings.candidate_id, candidates.id))
    .where(and(eq(candidates.job_id, jobId), eq(candidates.is_archived, false)));

  // Latest screening per candidate (mirrors `distinct on (c.id) ... order by created_at desc`).
  const latest = new Map<string, { criteria: unknown; created_at: string }>();
  for (const r of rows) {
    const prev = latest.get(r.candidate_id);
    if (!prev || r.created_at > prev.created_at) {
      latest.set(r.candidate_id, { criteria: r.criteria, created_at: r.created_at });
    }
  }
  if (latest.size === 0) return 0;

  const updates = [...latest.entries()].map(([candidateId, { criteria }]) =>
    db
      .update(candidates)
      .set({ ai_score: computeWeightedTotal(readCriteriaScores(criteria), newWeights) })
      .where(eq(candidates.id, candidateId)),
  );
  const [first, ...rest] = updates;
  await db.batch([first!, ...rest]);
  return updates.length;
}

/**
 * Atomic dequeue — TypeScript port of the old `pick_scoring_job()` Postgres RPC
 * (migration 0014, SELECT ... FOR UPDATE SKIP LOCKED). D1 statements are
 * serialized per database, so a single UPDATE-with-subquery-RETURNING gives the
 * same "no two workers claim the same row" guarantee. Returns the claimed row
 * (now status='running', attempts+1) or null when the queue is empty.
 */
export async function pickScoringJob(): Promise<ScoringQueueRow | null> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const rows = await db.all<ScoringQueueRow>(sql`
    UPDATE scoring_queue
    SET status = 'running',
        started_at = ${nowIso},
        attempts = attempts + 1
    WHERE id = (
      SELECT id FROM scoring_queue
      WHERE status = 'queued'
         OR (status = 'failed' AND next_retry_at IS NOT NULL AND next_retry_at <= ${nowIso})
      ORDER BY enqueued_at ASC
      LIMIT 1
    )
    RETURNING *
  `);
  return rows[0] ?? null;
}

/** Used by the cron drain to find queued + retry-due rows. */
export async function listDrainableQueueRows(limit = 10): Promise<ScoringQueueRow[]> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  return db
    .select()
    .from(scoring_queue)
    .where(
      or(
        eq(scoring_queue.status, "queued"),
        and(eq(scoring_queue.status, "failed"), lte(scoring_queue.next_retry_at, nowIso)),
      ),
    )
    .orderBy(asc(scoring_queue.enqueued_at))
    .limit(limit);
}

/**
 * Re-export weights helper for callers that already have a Job row in hand.
 */
export function jobWeights(jobWeightsJson: unknown): Weights {
  return readWeights(jobWeightsJson);
}
