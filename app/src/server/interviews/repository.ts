import "server-only";
import { and, asc, eq, gte, inArray, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { interviews, interview_attendees, interview_evaluations, users } from "@/db/schema";
import type { Database, Tables } from "@/types/db";

export type InterviewRow = Tables<"interviews">;
export type InterviewAttendeeRow = Tables<"interview_attendees">;
export type InterviewEvaluationRow = Tables<"interview_evaluations">;
export type InterviewStatus = Database["public"]["Enums"]["interview_status"];
export type InterviewType = Database["public"]["Enums"]["interview_type"];

export interface InterviewListFilters {
  candidate_id?: string;
  job_id?: string;
  status?: InterviewStatus;
  /** Limit to interviews where the given user is an attendee. */
  for_user_id?: string;
  /** Only future / today onwards. */
  upcoming_only?: boolean;
}

export async function listInterviews(filters: InterviewListFilters = {}): Promise<InterviewRow[]> {
  const db = await getDb();
  const conds: SQL[] = [];
  if (filters.candidate_id) conds.push(eq(interviews.candidate_id, filters.candidate_id));
  if (filters.job_id) conds.push(eq(interviews.job_id, filters.job_id));
  if (filters.status) conds.push(eq(interviews.status, filters.status));
  if (filters.upcoming_only) conds.push(gte(interviews.scheduled_at, new Date().toISOString()));
  if (filters.for_user_id) {
    // Hop through interview_attendees: fetch interview_ids first.
    const rows = await db
      .select({ interview_id: interview_attendees.interview_id })
      .from(interview_attendees)
      .where(eq(interview_attendees.user_id, filters.for_user_id));
    const ids = rows.map((r) => r.interview_id);
    if (ids.length === 0) return [];
    conds.push(inArray(interviews.id, ids));
  }
  return db
    .select()
    .from(interviews)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(asc(interviews.scheduled_at));
}

export async function getInterview(id: string): Promise<InterviewRow | null> {
  const db = await getDb();
  const rows = await db.select().from(interviews).where(eq(interviews.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listAttendees(interviewId: string): Promise<InterviewAttendeeRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(interview_attendees)
    .where(eq(interview_attendees.interview_id, interviewId));
}

export async function getEvaluation(
  interviewId: string,
  evaluatorId: string,
): Promise<InterviewEvaluationRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(interview_evaluations)
    .where(
      and(
        eq(interview_evaluations.interview_id, interviewId),
        eq(interview_evaluations.evaluator_user_id, evaluatorId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listEvaluations(interviewId: string): Promise<InterviewEvaluationRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(interview_evaluations)
    .where(eq(interview_evaluations.interview_id, interviewId))
    .orderBy(asc(interview_evaluations.created_at));
}

export interface CandidateEvaluationRow {
  interview_id: string;
  scheduled_at: string;
  interview_status: InterviewStatus;
  evaluator_user_id: string;
  recommendation: Database["public"]["Enums"]["recommendation"] | null;
  strengths: string | null;
  concerns: string | null;
  proposed_salary: number | null;
  created_at: string;
}

/**
 * All interview evaluations across a candidate's interviews — the manager's
 * "how did they do" digest on the candidate page (ADR 0019). Same join the
 * dossier builds inline (server/candidates/dossier.ts).
 */
export async function listEvaluationsForCandidate(
  candidateId: string,
): Promise<CandidateEvaluationRow[]> {
  const db = await getDb();
  return db
    .select({
      interview_id: interview_evaluations.interview_id,
      scheduled_at: interviews.scheduled_at,
      interview_status: interviews.status,
      evaluator_user_id: interview_evaluations.evaluator_user_id,
      recommendation: interview_evaluations.recommendation,
      strengths: interview_evaluations.strengths,
      concerns: interview_evaluations.concerns,
      proposed_salary: interview_evaluations.proposed_salary,
      created_at: interview_evaluations.created_at,
    })
    .from(interview_evaluations)
    .innerJoin(interviews, eq(interview_evaluations.interview_id, interviews.id))
    .where(eq(interviews.candidate_id, candidateId))
    .orderBy(asc(interview_evaluations.created_at));
}

/**
 * List potential interviewers — active admin / HR / hiring_manager users.
 * Authorization lives in the caller's requireRole guard (must be HR/admin).
 */
export async function listInterviewers(): Promise<
  Array<{ id: string; full_name: string | null; role: string }>
> {
  const db = await getDb();
  return db
    .select({ id: users.id, full_name: users.name, role: users.role })
    .from(users)
    .where(and(eq(users.isActive, true), inArray(users.role, ["admin", "hr", "hiring_manager"])));
}
