import "server-only";
import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  approvals,
  candidates,
  jobs,
  job_assignments,
  interviews,
  interview_evaluations,
} from "@/db/schema";
import type { Database, Tables } from "@/types/db";

export type ApprovalRow = Tables<"approvals">;
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

/** True iff this candidate has an approval step of `stepKind` for `role`
 * (any status) — used to scope exec read access (renovation R2). */
export async function hasApprovalStepForRole(
  candidateId: string,
  stepKind: "bod" | "tap_doan",
): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .select({ id: approvals.id })
    .from(approvals)
    .where(and(eq(approvals.candidate_id, candidateId), eq(approvals.step_kind, stepKind)))
    .limit(1);
  return row.length > 0;
}

export async function listApprovalsForCandidate(candidateId: string): Promise<ApprovalRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.candidate_id, candidateId))
    .orderBy(asc(approvals.step_index));
}

export interface PendingApprovalRow extends ApprovalRow {
  candidate_name: string | null;
  job_title: string | null;
}

/**
 * Pending approvals visible to a given user — bounded by their role.
 * - admin / hr: every pending row in the system
 * - hiring_manager: pending rows of step_kind 'manager_recommend' on candidates
 *   whose job assigns to this user (via job_assignments)
 * - bod / tap_doan: pending rows where step_kind matches the role
 *
 * Joins approvals → candidates → jobs to surface full_name + job title.
 */
export async function listPendingApprovalsForUser(
  userId: string,
  role: Database["public"]["Enums"]["user_role"],
): Promise<PendingApprovalRow[]> {
  const db = await getDb();

  const conds: SQL[] = [eq(approvals.status, "pending")];

  if (role === "bod") conds.push(eq(approvals.step_kind, "bod"));
  else if (role === "tap_doan") conds.push(eq(approvals.step_kind, "tap_doan"));
  else if (role === "hiring_manager") {
    conds.push(eq(approvals.step_kind, "manager_recommend"));
    // Further-narrow by job_assignments — fetch this user's assigned jobs first.
    const assigns = await db
      .select({ job_id: job_assignments.job_id })
      .from(job_assignments)
      .where(eq(job_assignments.manager_user_id, userId));
    const jobIds = assigns.map((r) => r.job_id);
    if (jobIds.length === 0) return [];
    // Filter via the joined candidates.job_id (same semantics as the old
    // candidate-id sub-select, without a 500-row IN list).
    conds.push(inArray(candidates.job_id, jobIds));
  }
  // admin/hr fall through with no extra filter.

  const rows = await db
    .select({
      approval: approvals,
      candidate_name: candidates.full_name,
      job_title: jobs.title,
    })
    .from(approvals)
    .innerJoin(candidates, eq(approvals.candidate_id, candidates.id))
    .innerJoin(jobs, eq(candidates.job_id, jobs.id))
    .where(and(...conds))
    .orderBy(asc(approvals.created_at));

  return rows.map<PendingApprovalRow>((r) => ({
    ...r.approval,
    candidate_name: r.candidate_name ?? null,
    job_title: r.job_title ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Exec decision digest (renovation R2): the approver decides from a card that
// carries the actual decision material — score, interview tally, offer terms —
// instead of just a name (audit: BOD/Tập đoàn were approving blind).
// ---------------------------------------------------------------------------

export interface EvalTally {
  count: number;
  strong_yes: number;
  yes: number;
  maybe: number;
  no: number;
  /** Highest proposed salary across evaluations (VND), or null. */
  proposed_salary: number | null;
}

/** Pure aggregation over a candidate's interview evaluations. Unit-tested. */
export function tallyEvaluations(
  rows: Array<{ recommendation: string | null; proposed_salary: number | null }>,
): EvalTally {
  const tally: EvalTally = {
    count: rows.length,
    strong_yes: 0,
    yes: 0,
    maybe: 0,
    no: 0,
    proposed_salary: null,
  };
  for (const r of rows) {
    if (r.recommendation === "strong_yes") tally.strong_yes++;
    else if (r.recommendation === "yes") tally.yes++;
    else if (r.recommendation === "maybe") tally.maybe++;
    else if (r.recommendation === "no") tally.no++;
    if (r.proposed_salary != null)
      tally.proposed_salary = Math.max(tally.proposed_salary ?? 0, r.proposed_salary);
  }
  return tally;
}

export interface PendingApprovalDigest extends PendingApprovalRow {
  candidate_id: string;
  ai_score: number | null;
  ai_summary: string | null;
  location: string | null;
  expected_start_date: string | null;
  salary_min: number | null;
  salary_max: number | null;
  interview_count: number;
  eval: EvalTally;
}

/**
 * Like `listPendingApprovalsForUser` but hydrated with the decision material
 * an exec needs. Two batched follow-up queries over the candidate-id set.
 */
export async function listPendingApprovalDigestsForUser(
  userId: string,
  role: Database["public"]["Enums"]["user_role"],
): Promise<PendingApprovalDigest[]> {
  const db = await getDb();
  const base = await listPendingApprovalsForUser(userId, role);
  if (base.length === 0) return [];

  const candidateIds = [...new Set(base.map((r) => r.candidate_id))];

  const [candRows, evalRows, interviewCounts] = await Promise.all([
    db
      .select({
        id: candidates.id,
        ai_score: candidates.ai_score,
        ai_summary: candidates.ai_summary,
        location: candidates.location,
        expected_start_date: candidates.expected_start_date,
        salary_min: jobs.salary_min,
        salary_max: jobs.salary_max,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.job_id, jobs.id))
      .where(inArray(candidates.id, candidateIds)),
    db
      .select({
        candidate_id: interviews.candidate_id,
        recommendation: interview_evaluations.recommendation,
        proposed_salary: interview_evaluations.proposed_salary,
      })
      .from(interview_evaluations)
      .innerJoin(interviews, eq(interview_evaluations.interview_id, interviews.id))
      .where(inArray(interviews.candidate_id, candidateIds)),
    db
      .select({ candidate_id: interviews.candidate_id, status: interviews.status })
      .from(interviews)
      .where(inArray(interviews.candidate_id, candidateIds)),
  ]);

  const candMap = new Map(candRows.map((c) => [c.id, c]));
  const evalsByCand = new Map<
    string,
    Array<{ recommendation: string | null; proposed_salary: number | null }>
  >();
  for (const e of evalRows) {
    const arr = evalsByCand.get(e.candidate_id) ?? [];
    arr.push({ recommendation: e.recommendation, proposed_salary: e.proposed_salary });
    evalsByCand.set(e.candidate_id, arr);
  }
  const completedByCand = new Map<string, number>();
  for (const iv of interviewCounts)
    if (iv.status === "completed")
      completedByCand.set(iv.candidate_id, (completedByCand.get(iv.candidate_id) ?? 0) + 1);

  return base.map<PendingApprovalDigest>((r) => {
    const c = candMap.get(r.candidate_id);
    return {
      ...r,
      ai_score: c?.ai_score ?? null,
      ai_summary: c?.ai_summary ?? null,
      location: c?.location ?? null,
      expected_start_date: c?.expected_start_date ?? null,
      salary_min: c?.salary_min ?? null,
      salary_max: c?.salary_max ?? null,
      interview_count: completedByCand.get(r.candidate_id) ?? 0,
      eval: tallyEvaluations(evalsByCand.get(r.candidate_id) ?? []),
    };
  });
}
