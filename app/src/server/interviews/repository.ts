import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const supabase = await createClient();
  let q = supabase.from("interviews").select("*");
  if (filters.candidate_id) q = q.eq("candidate_id", filters.candidate_id);
  if (filters.job_id) q = q.eq("job_id", filters.job_id);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.upcoming_only) q = q.gte("scheduled_at", new Date().toISOString());
  if (filters.for_user_id) {
    // Hop through interview_attendees. Easier than a join via the JS client:
    // fetch interview_ids first.
    const { data: rows, error } = await supabase
      .from("interview_attendees")
      .select("interview_id")
      .eq("user_id", filters.for_user_id);
    if (error) throw error;
    const ids = (rows ?? []).map((r) => (r as { interview_id: string }).interview_id);
    if (ids.length === 0) return [];
    q = q.in("id", ids);
  }
  const { data, error } = await q.order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InterviewRow[];
}

export async function getInterview(id: string): Promise<InterviewRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("interviews").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as InterviewRow | null;
}

export async function listAttendees(interviewId: string): Promise<InterviewAttendeeRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_attendees")
    .select("*")
    .eq("interview_id", interviewId);
  if (error) throw error;
  return (data ?? []) as InterviewAttendeeRow[];
}

export async function getEvaluation(
  interviewId: string,
  evaluatorId: string,
): Promise<InterviewEvaluationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_evaluations")
    .select("*")
    .eq("interview_id", interviewId)
    .eq("evaluator_user_id", evaluatorId)
    .maybeSingle();
  if (error) throw error;
  return data as InterviewEvaluationRow | null;
}

export async function listEvaluations(interviewId: string): Promise<InterviewEvaluationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_evaluations")
    .select("*")
    .eq("interview_id", interviewId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InterviewEvaluationRow[];
}

/**
 * List potential interviewers — admin / HR / hiring_manager profiles.
 * Uses admin client to bypass profiles RLS (which restricts to is_hr() or self).
 * Caller MUST be already-authorized HR/admin.
 */
export async function listInterviewers(): Promise<
  Array<{ id: string; full_name: string | null; role: string }>
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .in("role", ["admin", "hr", "hiring_manager"]);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; full_name: string | null; role: string }>;
}
