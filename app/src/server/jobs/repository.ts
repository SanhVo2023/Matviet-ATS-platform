import "server-only";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, departments, jobs, job_assignments, users } from "@/db/schema";
import type { Database, Tables } from "@/types/db";

export type JobRow = Tables<"jobs">;
export type JobAssignmentRow = Tables<"job_assignments">;
export type JobStatus = Database["public"]["Enums"]["job_status"];

export interface JobListFilters {
  status?: JobStatus | "all";
  department_id?: string | null;
  search?: string;
}

/** Server-only: list jobs visible to the current session (scoping via requireRole guards). */
export async function listJobs(filters: JobListFilters = {}): Promise<JobRow[]> {
  const db = await getDb();
  const conds = [eq(jobs.is_archived, false)];

  if (filters.status && filters.status !== "all") conds.push(eq(jobs.status, filters.status));
  if (filters.department_id) conds.push(eq(jobs.department_id, filters.department_id));
  if (filters.search?.trim()) conds.push(like(jobs.title, `%${filters.search.trim()}%`));

  return db
    .select()
    .from(jobs)
    .where(and(...conds))
    .orderBy(desc(jobs.created_at));
}

export async function getJob(id: string): Promise<JobRow | null> {
  const db = await getDb();
  const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getJobAssignments(jobId: string): Promise<JobAssignmentRow[]> {
  const db = await getDb();
  return db.select().from(job_assignments).where(eq(job_assignments.job_id, jobId));
}

export interface DepartmentLite {
  id: string;
  name: string;
}

export async function listDepartments(): Promise<DepartmentLite[]> {
  const db = await getDb();
  return db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .orderBy(asc(departments.name));
}

export interface ManagerProfile {
  id: string;
  full_name: string | null;
  department_id: string | null;
  department_name?: string | null;
}

/**
 * List users eligible to be hiring managers (old `profiles` shape, now `users`).
 * Caller MUST be admin/HR (enforced by the action that calls this).
 */
export async function listHiringManagers(): Promise<ManagerProfile[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      full_name: users.name,
      department_id: users.departmentId,
      department_name: departments.name,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(and(eq(users.role, "hiring_manager"), eq(users.isActive, true)))
    .orderBy(asc(users.name));

  return rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    department_id: row.department_id,
    department_name: row.department_name ?? null,
  }));
}

export interface JobCandidateCounts {
  job_id: string;
  total: number;
  active: number;
  hired: number;
}

/**
 * Per-job candidate tallies for the positions list (ADR 0016 workspace pass):
 * total CVs, still-in-pipeline count, and hires (vs headcount).
 */
export async function countCandidatesByJob(): Promise<JobCandidateCounts[]> {
  const db = await getDb();
  return db
    .select({
      job_id: candidates.job_id,
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${candidates.current_stage} not in ('hired','rejected','withdrew') then 1 else 0 end)`,
      hired: sql<number>`sum(case when ${candidates.current_stage} = 'hired' then 1 else 0 end)`,
    })
    .from(candidates)
    .groupBy(candidates.job_id);
}
