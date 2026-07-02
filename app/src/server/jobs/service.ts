import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { jobs, job_assignments } from "@/db/schema";
import type { JobInput } from "@/lib/validation/job";
import type { Database, TablesInsert, TablesUpdate } from "@/types/db";

export type JobStatus = Database["public"]["Enums"]["job_status"];

type JobUpdate = TablesUpdate<"jobs">;
type AssignmentInsert = TablesInsert<"job_assignments">;

/**
 * Convert form input to a `jobs` row. Numeric/string normalization happens
 * here so the repository can stay dumb about Vietnamese-locale quirks.
 */
function toJobRow(input: JobInput) {
  return {
    title: input.title,
    department_id: input.department_id ?? null,
    role_family: input.role_family,
    flow_type: input.flow_type,
    description: input.description || null,
    requirements: input.requirements_html ? { html: input.requirements_html } : {},
    location: input.location ?? null,
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    headcount: input.headcount,
    weights: input.weights,
  };
}

/**
 * Create a job + write `job_assignments`. Called from the create server action.
 * `status` is set by the caller (draft when "save_draft", open when "publish").
 */
export async function createJobWithAssignments(
  input: JobInput,
  status: JobStatus,
  createdBy: string,
): Promise<{ id: string }> {
  const db = await getDb();

  const inserted = await db
    .insert(jobs)
    .values({
      ...toJobRow(input),
      status,
      created_by: createdBy,
      posted_at: status === "open" ? new Date().toISOString() : null,
    })
    .returning({ id: jobs.id });

  const job = inserted[0];
  if (!job) throw new Error("Insert failed");

  if (input.hiring_manager_ids.length > 0) {
    const rows: AssignmentInsert[] = input.hiring_manager_ids.map((manager_user_id) => ({
      job_id: job.id,
      manager_user_id,
    }));
    await db.insert(job_assignments).values(rows);
  }

  return { id: job.id };
}

/**
 * Update an existing job. Replaces job_assignments wholesale (simpler than
 * diffing — assignments are a small set, ≤10 rows per job in practice).
 */
export async function updateJobWithAssignments(
  id: string,
  input: JobInput,
  publish: boolean,
): Promise<void> {
  const db = await getDb();

  // Fetch current row to know whether we're transitioning draft → open
  const current = await db
    .select({ status: jobs.status, posted_at: jobs.posted_at })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!current) throw new Error("Job not found");

  const nextStatus: JobStatus = publish && current.status === "draft" ? "open" : current.status;
  const postedAt =
    current.posted_at ?? (publish && current.status === "draft" ? new Date().toISOString() : null);

  await db
    .update(jobs)
    .set({
      ...toJobRow(input),
      status: nextStatus,
      posted_at: postedAt,
    })
    .where(eq(jobs.id, id));

  // Replace assignments (batched so delete + insert land atomically)
  const deleteStmt = db.delete(job_assignments).where(eq(job_assignments.job_id, id));
  if (input.hiring_manager_ids.length > 0) {
    const rows: AssignmentInsert[] = input.hiring_manager_ids.map((manager_user_id) => ({
      job_id: id,
      manager_user_id,
    }));
    await db.batch([deleteStmt, db.insert(job_assignments).values(rows)]);
  } else {
    await deleteStmt;
  }
}

export async function setJobStatus(id: string, status: JobStatus): Promise<void> {
  const db = await getDb();
  const update: JobUpdate = { status };
  if (status === "closed" || status === "filled") {
    update.closed_at = new Date().toISOString();
  }
  if (status === "open") {
    update.posted_at = new Date().toISOString();
  }
  await db.update(jobs).set(update).where(eq(jobs.id, id));
}

export async function archiveJob(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(jobs)
    .set({ is_archived: true, closed_at: new Date().toISOString() })
    .where(eq(jobs.id, id));
}
