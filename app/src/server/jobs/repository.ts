import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Tables } from "@/types/db";

export type JobRow = Tables<"jobs">;
export type JobAssignmentRow = Tables<"job_assignments">;
export type JobStatus = Database["public"]["Enums"]["job_status"];

export interface JobListFilters {
  status?: JobStatus | "all";
  department_id?: string | null;
  search?: string;
}

/** Server-only: list jobs the current session can see (RLS-aware). */
export async function listJobs(filters: JobListFilters = {}): Promise<JobRow[]> {
  const supabase = await createClient();
  let query = supabase.from("jobs").select("*").eq("is_archived", false);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.department_id) query = query.eq("department_id", filters.department_id);
  if (filters.search?.trim()) query = query.ilike("title", `%${filters.search.trim()}%`);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JobRow[];
}

export async function getJob(id: string): Promise<JobRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as JobRow | null;
}

export async function getJobAssignments(jobId: string): Promise<JobAssignmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("job_assignments").select("*").eq("job_id", jobId);
  if (error) throw error;
  return (data ?? []) as JobAssignmentRow[];
}

export interface DepartmentLite {
  id: string;
  name: string;
}

export async function listDepartments(): Promise<DepartmentLite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").select("id, name").order("name");
  if (error) throw error;
  return (data ?? []) as DepartmentLite[];
}

export interface ManagerProfile {
  id: string;
  full_name: string | null;
  department_id: string | null;
  department_name?: string | null;
}

/**
 * List profiles eligible to be hiring managers. Uses the admin client because
 * `auth.users.email` joins live in `auth.*` which the anon RLS doesn't traverse.
 * Caller MUST be admin/HR (enforced by the action that calls this).
 */
export async function listHiringManagers(): Promise<ManagerProfile[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, department_id, departments:department_id(name)")
    .eq("role", "hiring_manager")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return (
    (data ?? []) as Array<{
      id: string;
      full_name: string | null;
      department_id: string | null;
      departments: { name: string } | null;
    }>
  ).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    department_id: row.department_id,
    department_name: row.departments?.name ?? null,
  }));
}
