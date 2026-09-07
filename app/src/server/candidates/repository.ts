import "server-only";
import { and, desc, eq, inArray, like, or, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  candidates,
  cv_files,
  job_assignments,
  stage_history,
  users,
  interviews,
  interview_evaluations,
  assessment_submissions,
  approvals,
} from "@/db/schema";
import { deriveCandidateStatus, type DerivedStatus } from "@/lib/candidate-status";
import type { Database, Tables } from "@/types/db";

export type CandidateRow = Tables<"candidates">;
export type CandidateWithStatus = CandidateRow & { derived: DerivedStatus };
export type CvFileRow = Tables<"cv_files">;
export type StageHistoryRow = Tables<"stage_history">;
export type Stage = Database["public"]["Enums"]["pipeline_stage"];
export type Source = Database["public"]["Enums"]["candidate_source"];

export interface CandidateListFilters {
  job_id?: string | null;
  stage?: Stage | "all";
  source?: Source | "all";
  search?: string;
  /** When set (hiring_manager callers), restrict to candidates on jobs this user is assigned to. */
  for_manager_user_id?: string | null;
}

export async function listCandidates(filters: CandidateListFilters = {}): Promise<CandidateRow[]> {
  const db = await getDb();
  const conds = [eq(candidates.is_archived, false)];

  if (filters.job_id) conds.push(eq(candidates.job_id, filters.job_id));
  if (filters.for_manager_user_id) {
    conds.push(
      inArray(
        candidates.job_id,
        db
          .select({ job_id: job_assignments.job_id })
          .from(job_assignments)
          .where(eq(job_assignments.manager_user_id, filters.for_manager_user_id)),
      ),
    );
  }
  if (filters.stage && filters.stage !== "all")
    conds.push(eq(candidates.current_stage, filters.stage));
  if (filters.source && filters.source !== "all") conds.push(eq(candidates.source, filters.source));
  if (filters.search?.trim()) {
    const s = `%${filters.search.trim()}%`;
    const searchCond = or(
      like(candidates.full_name, s),
      like(candidates.email, s),
      like(candidates.phone, s),
    );
    if (searchCond) conds.push(searchCond);
  }

  return db
    .select()
    .from(candidates)
    .where(and(...conds))
    .orderBy(desc(candidates.created_at));
}

/**
 * Attach a DerivedStatus to each candidate (renovation R1) with a handful of
 * batched IN-queries instead of per-row lookups — so kanban cards, the table,
 * and the dashboard all show the same "waiting on whom, how many days".
 */
export async function attachDerivedStatus(
  rows: CandidateRow[],
  now?: number,
): Promise<CandidateWithStatus[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);

  const [lastChanges, nextInterviews, owedEval, pendingSteps, submissions] = await Promise.all([
    db
      .select({
        candidate_id: stage_history.candidate_id,
        at: sql<string>`MAX(${stage_history.at})`,
      })
      .from(stage_history)
      .where(inArray(stage_history.candidate_id, ids))
      .groupBy(stage_history.candidate_id),
    db
      .select({
        candidate_id: interviews.candidate_id,
        at: sql<string>`MIN(${interviews.scheduled_at})`,
      })
      .from(interviews)
      .where(and(inArray(interviews.candidate_id, ids), eq(interviews.status, "scheduled")))
      .groupBy(interviews.candidate_id),
    // completed interviews with no evaluation row → owes an evaluation
    db
      .select({ candidate_id: interviews.candidate_id })
      .from(interviews)
      .leftJoin(interview_evaluations, eq(interview_evaluations.interview_id, interviews.id))
      .where(
        and(
          inArray(interviews.candidate_id, ids),
          eq(interviews.status, "completed"),
          isNull(interview_evaluations.id),
        ),
      ),
    // lowest pending approval step per candidate
    db
      .select({
        candidate_id: approvals.candidate_id,
        step_kind: approvals.step_kind,
        step_index: approvals.step_index,
      })
      .from(approvals)
      .where(and(inArray(approvals.candidate_id, ids), eq(approvals.status, "pending")))
      .orderBy(approvals.step_index),
    db
      .select({
        candidate_id: assessment_submissions.candidate_id,
        submitted_at: assessment_submissions.submitted_at,
        score: assessment_submissions.score,
        created_at: assessment_submissions.created_at,
      })
      .from(assessment_submissions)
      .where(inArray(assessment_submissions.candidate_id, ids))
      .orderBy(desc(assessment_submissions.created_at)),
  ]);

  const lastMap = new Map(lastChanges.map((r) => [r.candidate_id, r.at]));
  const nextIvMap = new Map(nextInterviews.map((r) => [r.candidate_id, r.at]));
  const owedSet = new Set(owedEval.map((r) => r.candidate_id));
  const stepMap = new Map<string, (typeof pendingSteps)[number]["step_kind"]>();
  for (const s of pendingSteps)
    if (!stepMap.has(s.candidate_id)) stepMap.set(s.candidate_id, s.step_kind);
  const subMap = new Map<string, { submitted_at: string | null; score: number | null }>();
  for (const s of submissions)
    if (!subMap.has(s.candidate_id))
      subMap.set(s.candidate_id, { submitted_at: s.submitted_at, score: s.score });

  return rows.map((r) => {
    const sub = subMap.get(r.id);
    return {
      ...r,
      derived: deriveCandidateStatus(r, {
        now,
        lastStageChangeAt: lastMap.get(r.id) ?? r.created_at,
        nextInterviewAt: nextIvMap.get(r.id) ?? null,
        awaitingEvaluation: owedSet.has(r.id),
        testAwaitingSubmission: !!sub && !sub.submitted_at,
        testAwaitingGrade: !!sub?.submitted_at && sub.score == null,
        pendingApprovalStep: stepMap.get(r.id) ?? null,
      }),
    };
  });
}

export async function getCandidate(id: string): Promise<CandidateRow | null> {
  const db = await getDb();
  const rows = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getCvFile(cvFileId: string): Promise<CvFileRow | null> {
  const db = await getDb();
  const rows = await db.select().from(cv_files).where(eq(cv_files.id, cvFileId)).limit(1);
  return rows[0] ?? null;
}

export async function getStageHistory(candidateId: string): Promise<StageHistoryRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(stage_history)
    .where(eq(stage_history.candidate_id, candidateId))
    .orderBy(desc(stage_history.at));
}

/**
 * URL for a CV file, now served by the authed R2 streaming route
 * (`/api/files/[...path]`) instead of a Supabase signed URL. Kept async
 * (and keeps the legacy `expiresInSec` parameter) so callers don't change.
 */
export async function signCvUrl(storagePath: string, _expiresInSec = 600): Promise<string | null> {
  if (!storagePath) return null;
  return "/api/files/" + storagePath.split("/").map(encodeURIComponent).join("/");
}

/**
 * Bulk lookup of user display names for stage history actor display
 * (old `profiles` table, now `users`).
 */
export async function lookupProfileNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const db = await getDb();
  const rows = await db
    .select({ id: users.id, full_name: users.name })
    .from(users)
    .where(inArray(users.id, ids));
  return Object.fromEntries(rows.map((p) => [p.id, p.full_name ?? "—"]));
}
