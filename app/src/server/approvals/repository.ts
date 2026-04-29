import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Tables } from "@/types/db";

export type ApprovalRow = Tables<"approvals">;
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

export async function listApprovalsForCandidate(candidateId: string): Promise<ApprovalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("step_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ApprovalRow[];
}

export interface PendingApprovalRow extends ApprovalRow {
  candidate_name: string | null;
  job_title: string | null;
}

/**
 * Pending approvals visible to a given user — bounded by their role.
 * - admin / hr: every pending row in the system
 * - hiring_manager: pending rows of step_kind 'manager_recommend' on candidates
 *   whose job assigns to this user
 * - bod / tap_doan: pending rows where step_kind matches the role
 *
 * Uses admin client because cross-row joins (approvals → candidates → jobs →
 * profiles for full_name + job title) get awkward through RLS.
 */
export async function listPendingApprovalsForUser(
  userId: string,
  role: Database["public"]["Enums"]["user_role"],
): Promise<PendingApprovalRow[]> {
  const admin = createAdminClient();

  let q = admin
    .from("approvals")
    .select("*, candidate:candidates!inner(full_name, job:jobs!inner(title))")
    .eq("status", "pending");

  if (role === "bod") q = q.eq("step_kind", "bod");
  else if (role === "tap_doan") q = q.eq("step_kind", "tap_doan");
  else if (role === "hiring_manager") {
    q = q.eq("step_kind", "manager_recommend");
    // Further-narrow by job_assignments — fetch this user's assigned jobs first.
    const { data: assigns } = await admin
      .from("job_assignments")
      .select("job_id")
      .eq("manager_user_id", userId);
    const jobIds = (assigns ?? []).map((r) => (r as { job_id: string }).job_id);
    if (jobIds.length === 0) return [];
    // Filter via a sub-select on candidates.job_id
    const { data: cands } = await admin.from("candidates").select("id").in("job_id", jobIds);
    const candIds = (cands ?? []).map((r) => (r as { id: string }).id);
    if (candIds.length === 0) return [];
    q = q.in("candidate_id", candIds);
  }
  // admin/hr fall through with no extra filter.

  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;

  // Flatten the joined rows
  type Joined = ApprovalRow & {
    candidate?: { full_name: string | null; job?: { title: string | null } | null } | null;
  };
  return ((data ?? []) as unknown as Joined[]).map<PendingApprovalRow>((r) => ({
    ...(r as ApprovalRow),
    candidate_name: r.candidate?.full_name ?? null,
    job_title: r.candidate?.job?.title ?? null,
  }));
}
