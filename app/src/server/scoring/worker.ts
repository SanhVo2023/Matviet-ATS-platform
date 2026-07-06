/**
 * In-process CV scoring worker (ADR 0009).
 *
 * Replaces the Supabase Edge Function `score-candidate` — the Deno-side code
 * duplication is gone; this file consumes the Next-side modules directly
 * (prompts/schemas/weights/evidence/rubric/cost) which were always the source
 * of truth.
 *
 * Failure policy (unchanged from G4):
 *   - Gemini 429/5xx/timeout → retry with backoff 5/10/20s, max 3 attempts
 *   - Quota exhausted → next_retry_at = next midnight UTC+7
 *   - Schema/parse failures, missing CV → no retry, candidate flagged
 *     ai_screening_status='failed' (manual sliders in UI)
 *   - DOCX without pdf_storage_path → fail "Cần chuyển đổi DOCX sang PDF"
 *
 * D1 has no triggers: the old `bump_candidate_score` denormalization
 * (ai_score/ai_breakdown/status onto candidates) happens explicitly here.
 */
import "server-only";
import { and, asc, eq, lte, lt, or, sql } from "drizzle-orm";
import { extractCvText } from "./extract-text";
import { getDb } from "@/db";
import {
  ai_screenings,
  candidates,
  cv_files,
  jobs,
  scoring_queue,
  stage_history,
} from "@/db/schema";
import { getFile } from "@/lib/r2";
import { aiJson, aiModelId, computeAiCost } from "@/lib/ai/workers-ai";
import "@/server/ai/runtime";
import {
  ParsedCvSchema,
  PARSE_RESPONSE_SCHEMA,
  ScoreResultSchema,
  SCORE_RESPONSE_SCHEMA,
} from "@/lib/ai/gemini/schemas";
import {
  buildScoreSystemPrompt,
  buildScoreUserPrompt,
  PARSE_SYSTEM_PROMPT,
  PARSE_USER_PROMPT,
} from "@/lib/ai/gemini/prompts";
import type { ParsedCv, ScoreResult, Weights, CriterionCode } from "@/lib/ai/gemini/types";
import { notifyRoles } from "@/server/notifications/service";
import { readWeights, computeWeightedTotalFromVerified, applyEvidenceDiscount } from "./weights";
import { validateEvidence } from "./evidence";
import { getRubricForJob, rubricGuidanceMap } from "./rubric";

const PDF_MIME = "application/pdf";
/** A 'running' row older than this is considered orphaned (worker was cut off)
 * and re-claimable. 3 min: comfortably longer than the slowest observed job
 * (~100s), short enough that the 1-minute cron rescues drops quickly. */
const STALE_RUNNING_MS = 3 * 60 * 1000;

type QueueRow = typeof scoring_queue.$inferSelect;

export interface ScoringOutcome {
  status: "idle" | "succeeded" | "failed";
  candidate_id?: string;
  screening_id?: string;
  error?: string;
  retriable?: boolean;
  duration_ms?: number;
}

/**
 * Claim the next due queue row (or a specific candidate's row) and process it.
 * Safe to call concurrently at our scale: the claim UPDATE is a single atomic
 * D1 statement keyed on the picked id + expected status.
 */
export async function runScoringJob(candidateId?: string): Promise<ScoringOutcome> {
  const queueRow = await claimJob(candidateId);
  if (!queueRow) return { status: "idle" };

  const start = Date.now();
  const db = await getDb();
  try {
    const screeningId = await processJob(queueRow);
    await db
      .update(scoring_queue)
      .set({ status: "succeeded", completed_at: new Date().toISOString(), last_error: null })
      .where(eq(scoring_queue.id, queueRow.id));
    await advanceStageAfterScoring(queueRow.candidate_id);
    await notifyScoringOutcome(queueRow.candidate_id, screeningId);
    return {
      status: "succeeded",
      candidate_id: queueRow.candidate_id,
      screening_id: screeningId,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const reason = errMessage(err);
    const retriable = isRetriable(err);
    console.error("[scoring] job failed:", err instanceof Error ? (err.stack ?? err.message) : err);
    const finalFailure = await markFailure(queueRow, reason, retriable, isQuotaError(err));
    if (finalFailure) await notifyScoringOutcome(queueRow.candidate_id, null, reason);
    return {
      status: "failed",
      candidate_id: queueRow.candidate_id,
      error: reason,
      retriable,
      duration_ms: Date.now() - start,
    };
  }
}

async function claimJob(candidateId?: string): Promise<QueueRow | null> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - STALE_RUNNING_MS).toISOString();

  const dueFilter = or(
    eq(scoring_queue.status, "queued"),
    and(
      eq(scoring_queue.status, "failed"),
      sql`${scoring_queue.next_retry_at} IS NOT NULL`,
      lte(scoring_queue.next_retry_at, nowIso),
    ),
    // orphaned-running recovery: the isolate died mid-job
    and(eq(scoring_queue.status, "running"), lt(scoring_queue.started_at, staleIso)),
  );

  const where = candidateId
    ? and(eq(scoring_queue.candidate_id, candidateId), dueFilter)
    : dueFilter;

  const picked = await db
    .select()
    .from(scoring_queue)
    .where(where)
    .orderBy(asc(scoring_queue.enqueued_at))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!picked) return null;

  const claimed = await db
    .update(scoring_queue)
    .set({ status: "running", started_at: nowIso, attempts: picked.attempts + 1 })
    .where(and(eq(scoring_queue.id, picked.id), eq(scoring_queue.status, picked.status)))
    .returning();
  if (claimed.length === 0) return null; // someone else claimed it between select & update
  return claimed[0]!;
}

async function processJob(q: QueueRow): Promise<string> {
  const db = await getDb();

  const candidate = await db
    .select({
      id: candidates.id,
      job_id: candidates.job_id,
      full_name: candidates.full_name,
      cv_file_id: candidates.cv_file_id,
    })
    .from(candidates)
    .where(eq(candidates.id, q.candidate_id))
    .get();
  if (!candidate) throw new NonRetriableError("Không tìm thấy ứng viên.");
  if (!candidate.cv_file_id) throw new NonRetriableError("Ứng viên chưa có CV đính kèm.");

  const cvFile = await db
    .select()
    .from(cv_files)
    .where(eq(cv_files.id, candidate.cv_file_id))
    .get();
  if (!cvFile) throw new NonRetriableError("Không tìm thấy file CV.");

  // toMarkdown handles PDF *and* DOCX (and more) — prefer the converted PDF
  // path when one exists, else the original file whatever its format.
  const filePath = cvFile.pdf_storage_path ?? cvFile.storage_path;
  const fileMime = cvFile.pdf_storage_path ? PDF_MIME : cvFile.mime;

  const obj = await getFile(filePath);
  if (!obj) throw new Error(`Không tải được CV từ R2: ${filePath}`);
  const fileBytes = new Uint8Array(await obj.arrayBuffer());

  // Document → Markdown via Workers AI toMarkdown with pdf.js fallback
  // (shared with the upload-prefill path — extract-text.ts). Evidence quotes
  // verify against this ACTUAL document text either way.
  const rawText = await extractCvText(cvFile.original_name, fileBytes, fileMime);
  if (rawText.trim().length < 50) {
    throw new NonRetriableError(
      "Không trích xuất được nội dung CV (có thể là bản scan mờ) — cần chấm điểm thủ công.",
    );
  }

  const job = await db.select().from(jobs).where(eq(jobs.id, candidate.job_id)).get();
  if (!job) throw new NonRetriableError("Không tìm thấy tin tuyển dụng.");

  const weights = readWeights(job.weights);
  const { rubric, extraSystemNote } = getRubricForJob(job.role_family, job.title);
  const guidance = rubricGuidanceMap(rubric);

  const model = await aiModelId();

  // Pass 1 — parse CV
  const passOne = await runParse(rawText);
  passOne.parsed._raw_text = rawText;

  // Pass 2 — score
  const requirementsHtml =
    typeof job.requirements === "object" && job.requirements && "html" in job.requirements
      ? String((job.requirements as { html?: string }).html ?? "")
      : typeof job.requirements === "string"
        ? job.requirements
        : "";
  const passTwo = await runScore({
    parsedCv: passOne.parsed,
    jobTitle: job.title,
    jobDescription: job.description ?? "",
    jobRequirementsHtml: requirementsHtml,
    jobLocation: job.location ?? null,
    roleFamily: job.role_family,
    weights,
    rubricGuidance: guidance,
    extraSystemNote,
  });

  const verified = applyEvidenceDiscount(
    validateEvidence(passTwo.scored, passOne.parsed._raw_text),
  );
  const total = computeWeightedTotalFromVerified(verified, weights);

  const tokensIn = passOne.usage.in + passTwo.usage.in;
  const tokensOut = passOne.usage.out + passTwo.usage.out;
  const nowIso = new Date().toISOString();

  const inserted = await db
    .insert(ai_screenings)
    .values({
      candidate_id: q.candidate_id,
      model,
      pass1_raw: passOne.raw as never,
      pass2_raw: passTwo.raw as never,
      criteria: verified as never,
      weights_snapshot: weights as never,
      total,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: computeAiCost(model, tokensIn, tokensOut),
      duration_ms: passOne.durationMs + passTwo.durationMs,
      error: null,
    })
    .returning({ id: ai_screenings.id });
  const screeningId = inserted[0]!.id;

  // Explicit denormalization (was the bump_candidate_score trigger in Postgres)
  await db
    .update(candidates)
    .set({
      ai_score: total,
      ai_breakdown: verified as never,
      ai_scored_at: nowIso,
      ai_screening_status: "success",
      ai_screening_error: null,
      cv_text: passOne.parsed._raw_text.slice(0, 50_000),
      parsed: stripRawText(passOne.parsed) as never,
    })
    .where(eq(candidates.id, q.candidate_id));

  return screeningId;
}

function stripRawText(p: ParsedCv): Omit<ParsedCv, "_raw_text"> {
  const copy = { ...p } as Partial<ParsedCv>;
  delete copy._raw_text;
  return copy as Omit<ParsedCv, "_raw_text">;
}

// ---------- Workers AI calls (ADR 0013) ----------

interface PassUsage {
  in: number;
  out: number;
}

async function runParse(
  rawText: string,
): Promise<{ parsed: ParsedCv; raw: unknown; usage: PassUsage; durationMs: number }> {
  const start = Date.now();
  const { data, raw, usage } = await aiJson({
    system: PARSE_SYSTEM_PROMPT,
    user: `${PARSE_USER_PROMPT}\n\n--- NỘI DUNG CV (trích xuất từ PDF) ---\n${rawText.slice(0, 24_000)}`,
    jsonSchema: PARSE_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
    zod: ParsedCvSchema,
    // Reasoning models (Kimi/GLM/Nemotron) spend output tokens THINKING before
    // answering — a tight budget starves the answer (finish_reason=length).
    maxTokens: 8192,
    temperature: 0.1,
    feature: "scoring",
  });
  return {
    parsed: { ...data, _raw_text: "" },
    raw,
    usage,
    durationMs: Date.now() - start,
  };
}

async function runScore(args: {
  parsedCv: ParsedCv;
  jobTitle: string;
  jobDescription: string;
  jobRequirementsHtml: string;
  jobLocation: string | null;
  roleFamily: string;
  weights: Weights;
  rubricGuidance: Record<CriterionCode, string>;
  extraSystemNote: string;
}): Promise<{ scored: ScoreResult; raw: unknown; usage: PassUsage; durationMs: number }> {
  const start = Date.now();
  const userPrompt = buildScoreUserPrompt(args);
  const systemPrompt = args.extraSystemNote
    ? `${buildScoreSystemPrompt()}\n\n${args.extraSystemNote}`
    : buildScoreSystemPrompt();

  const { data, raw, usage } = await aiJson({
    system: systemPrompt,
    user: userPrompt,
    jsonSchema: SCORE_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
    zod: ScoreResultSchema,
    maxTokens: 8192, // reasoning-model headroom (thinking + answer)
    temperature: 0.2,
    feature: "scoring",
  });
  return { scored: data, raw, usage, durationMs: Date.now() - start };
}
// ---------- failure handling ----------

/** Returns true when the failure is FINAL (no retry scheduled). */
async function markFailure(
  q: QueueRow,
  reason: string,
  retriable: boolean,
  isQuota: boolean,
): Promise<boolean> {
  const db = await getDb();
  const attempts = q.attempts + 1; // claimJob already incremented in DB; q reflects post-claim value
  let nextRetry: string | null = null;
  if (retriable && q.attempts < 3) {
    const delaySec = isQuota
      ? secondsToNextMidnightUtc7()
      : 5 * Math.pow(2, Math.max(0, q.attempts - 1));
    nextRetry = new Date(Date.now() + delaySec * 1000).toISOString();
  }
  void attempts;

  await db
    .update(scoring_queue)
    .set({
      status: "failed",
      last_error: reason,
      next_retry_at: nextRetry,
      completed_at: nextRetry ? null : new Date().toISOString(),
    })
    .where(eq(scoring_queue.id, q.id));

  if (!nextRetry) {
    await db
      .update(candidates)
      .set({ ai_screening_status: "failed", ai_screening_error: reason })
      .where(eq(candidates.id, q.candidate_id));
  }
  return !nextRetry;
}

/**
 * Scoring done → the pipeline stage advances out of "Đang chấm" by itself.
 * ONLY the transient 'screening' stage moves (→ 'screened'). 'new' stays —
 * "Mới" is HR's untriaged inbox, not an AI state — and anything further
 * along (interview, offer, …) is never rolled back or touched.
 * Best-effort: a failure here must not fail the completed scoring job.
 */
async function advanceStageAfterScoring(candidateId: string): Promise<void> {
  try {
    const db = await getDb();
    const row = await db
      .select({ current_stage: candidates.current_stage })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (!row || row.current_stage !== "screening") return;
    await db.batch([
      db
        .update(candidates)
        .set({ current_stage: "screened" })
        .where(eq(candidates.id, candidateId)),
      db.insert(stage_history).values({
        candidate_id: candidateId,
        from_stage: row.current_stage,
        to_stage: "screened",
        actor_user_id: null,
        notes: "AI chấm điểm xong — tự chuyển giai đoạn",
      }),
    ]);
  } catch (err) {
    console.warn("[scoring] stage advance failed:", err);
  }
}

/**
 * Bell + push for HR/admin when scoring finishes. Scoring runs async
 * (queue/cron) so nobody is watching — this is the "kết quả đã có" signal.
 * screeningId null → permanent failure.
 */
async function notifyScoringOutcome(
  candidateId: string,
  screeningId: string | null,
  errorReason?: string,
): Promise<void> {
  try {
    const db = await getDb();
    const [cand, screening] = await Promise.all([
      db
        .select({ full_name: candidates.full_name })
        .from(candidates)
        .where(eq(candidates.id, candidateId))
        .limit(1)
        .then((r) => r[0] ?? null),
      screeningId
        ? db
            .select({ total: ai_screenings.total })
            .from(ai_screenings)
            .where(eq(ai_screenings.id, screeningId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
    ]);
    const name = cand?.full_name ?? "ứng viên";
    if (screeningId) {
      await notifyRoles(["hr", "admin"], {
        type: "scoring_done",
        title: `Chấm điểm xong: ${name}`,
        body: screening ? `Điểm AI: ${screening.total}/100` : null,
        link: `/ung-vien/${candidateId}`,
      });
    } else {
      await notifyRoles(["hr", "admin"], {
        type: "scoring_failed",
        title: `Chấm điểm thất bại: ${name}`,
        body: errorReason ? errorReason.slice(0, 140) : "Cần chấm điểm thủ công",
        link: `/ung-vien/${candidateId}`,
      });
    }
  } catch (err) {
    console.warn("[scoring] notify failed:", err);
  }
}

function secondsToNextMidnightUtc7(): number {
  // UTC+7 midnight = UTC 17:00 the previous day
  const now = new Date();
  const nextMid = new Date(now);
  nextMid.setUTCHours(17, 0, 0, 0);
  if (nextMid.getTime() <= now.getTime()) nextMid.setUTCDate(nextMid.getUTCDate() + 1);
  return Math.max(60, Math.floor((nextMid.getTime() - now.getTime()) / 1000));
}

class NonRetriableError extends Error {}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isRetriable(err: unknown): boolean {
  if (err instanceof NonRetriableError) return false;
  const msg = errMessage(err).toLowerCase();
  if (msg.includes("schema") || msg.includes("không hợp lệ") || msg.includes("không tìm thấy"))
    return false;
  return (
    msg.includes("rate") ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("capacity") ||
    msg.includes("tạm thời") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("timeout") ||
    msg.includes("fetch failed")
  );
}

function isQuotaError(err: unknown): boolean {
  const msg = errMessage(err).toLowerCase();
  return msg.includes("quota") || msg.includes("daily limit") || msg.includes("exhausted");
}
