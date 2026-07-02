import "server-only";
import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, cv_files, job_assignments, stage_history, users } from "@/db/schema";
import type { Database, Tables } from "@/types/db";

export type CandidateRow = Tables<"candidates">;
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
