import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JobInput } from "@/lib/validation/job";
import type { Database, TablesInsert, TablesUpdate } from "@/types/db";

export type JobStatus = Database["public"]["Enums"]["job_status"];

type JobInsert = TablesInsert<"jobs">;
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
 *
 * Note on the `as never` casts: @supabase/supabase-js 2.47 + strict TS
 * narrows .insert/.update payload generics to `never` in some chains.
 * We type-annotate the payload above for safety, then cast at the call site.
 */
export async function createJobWithAssignments(
  input: JobInput,
  status: JobStatus,
  createdBy: string,
): Promise<{ id: string }> {
  const supabase = await createClient();

  const insertPayload: JobInsert = {
    ...toJobRow(input),
    status,
    created_by: createdBy,
    posted_at: status === "open" ? new Date().toISOString() : null,
  };

  const { data, error: jobErr } = await supabase
    .from("jobs")
    .insert(insertPayload as never)
    .select("id")
    .single();

  if (jobErr || !data) throw jobErr ?? new Error("Insert failed");
  const job = data as { id: string };

  if (input.hiring_manager_ids.length > 0) {
    const rows: AssignmentInsert[] = input.hiring_manager_ids.map((manager_user_id) => ({
      job_id: job.id,
      manager_user_id,
    }));
    const { error: assignErr } = await supabase.from("job_assignments").insert(rows as never);
    if (assignErr) throw assignErr;
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
  const supabase = await createClient();

  // Fetch current row to know whether we're transitioning draft → open
  const { data: currentData, error: fetchErr } = await supabase
    .from("jobs")
    .select("status, posted_at")
    .eq("id", id)
    .single();
  if (fetchErr || !currentData) throw fetchErr ?? new Error("Job not found");
  const current = currentData as { status: JobStatus; posted_at: string | null };

  const nextStatus: JobStatus = publish && current.status === "draft" ? "open" : current.status;
  const postedAt =
    current.posted_at ?? (publish && current.status === "draft" ? new Date().toISOString() : null);

  const updatePayload: JobUpdate = {
    ...toJobRow(input),
    status: nextStatus,
    posted_at: postedAt,
  };

  const { error: updateErr } = await supabase
    .from("jobs")
    .update(updatePayload as never)
    .eq("id", id);
  if (updateErr) throw updateErr;

  // Replace assignments
  await supabase.from("job_assignments").delete().eq("job_id", id);
  if (input.hiring_manager_ids.length > 0) {
    const rows: AssignmentInsert[] = input.hiring_manager_ids.map((manager_user_id) => ({
      job_id: id,
      manager_user_id,
    }));
    const { error: assignErr } = await supabase.from("job_assignments").insert(rows as never);
    if (assignErr) throw assignErr;
  }
}

export async function setJobStatus(id: string, status: JobStatus): Promise<void> {
  const supabase = await createClient();
  const update: JobUpdate = { status };
  if (status === "closed" || status === "filled") {
    update.closed_at = new Date().toISOString();
  }
  if (status === "open") {
    update.posted_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("jobs")
    .update(update as never)
    .eq("id", id);
  if (error) throw error;
}

export async function archiveJob(id: string): Promise<void> {
  const supabase = await createClient();
  const update: JobUpdate = { is_archived: true, closed_at: new Date().toISOString() };
  const { error } = await supabase
    .from("jobs")
    .update(update as never)
    .eq("id", id);
  if (error) throw error;
}
