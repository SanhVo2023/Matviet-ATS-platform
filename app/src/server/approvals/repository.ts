import "server-only";
import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { approvals, candidates, jobs, job_assignments } from "@/db/schema";
import type { Database, Tables } from "@/types/db";

export type ApprovalRow = Tables<"approvals">;
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

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
