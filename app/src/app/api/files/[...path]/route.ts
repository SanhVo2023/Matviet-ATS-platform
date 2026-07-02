/**
 * /api/files/[...path] — authed R2 file streaming.
 *
 * Replaces Supabase Storage signed URLs after the Cloudflare pivot (ADR 0009).
 * Authorization (ADR 0011 — mirrors the old RLS storage policies):
 *   - admin / hr: any file
 *   - hiring_manager: only files belonging to candidates on jobs they're
 *     assigned to (job_assignments)
 *   - bod / tap_doan: no direct file access (same as the RLS era — exec
 *     approvers work from the in-app summary, not raw CVs)
 * Keys are the old storage paths unchanged (see src/lib/storage/paths.ts).
 */
import { and, eq, or } from "drizzle-orm";
import { getCurrentProfile } from "@/lib/auth";
import { getDb } from "@/db";
import {
  assessments,
  assessment_submissions,
  candidates,
  cv_files,
  job_assignments,
} from "@/db/schema";
import { assertSafeKey, getFile } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!["admin", "hr", "hiring_manager"].includes(profile.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { path } = await params;
  let key: string;
  try {
    key = assertSafeKey(path.map((segment) => decodeURIComponent(segment)).join("/"));
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (profile.role === "hiring_manager") {
    const jobId = await resolveOwningJob(key);
    if (!jobId || !(await isAssignedManager(profile.id, jobId))) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const obj = await getFile(key);
  if (!obj) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  // DOM Headers vs workers-types Headers are runtime-identical here.
  obj.writeHttpMetadata(headers as unknown as Parameters<typeof obj.writeHttpMetadata>[0]);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "private, max-age=300");
  return new Response(obj.body as ReadableStream, { headers });
}

/** Map a storage key back to the job that owns it (CVs, test files, submissions). */
async function resolveOwningJob(key: string): Promise<string | null> {
  const db = await getDb();

  // CV file (original or converted PDF) → candidate → job
  const viaCv = await db
    .select({ job_id: candidates.job_id })
    .from(cv_files)
    .innerJoin(candidates, eq(candidates.cv_file_id, cv_files.id))
    .where(or(eq(cv_files.storage_path, key), eq(cv_files.pdf_storage_path, key)))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (viaCv) return viaCv.job_id;

  // Assessment test file → job
  const viaAssessment = await db
    .select({ job_id: assessments.job_id })
    .from(assessments)
    .where(eq(assessments.test_storage_path, key))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (viaAssessment) return viaAssessment.job_id;

  // Assessment submission → candidate → job
  const viaSubmission = await db
    .select({ job_id: candidates.job_id })
    .from(assessment_submissions)
    .innerJoin(candidates, eq(candidates.id, assessment_submissions.candidate_id))
    .where(eq(assessment_submissions.submission_storage_path, key))
    .limit(1)
    .then((r) => r[0] ?? null);
  return viaSubmission?.job_id ?? null;
}

async function isAssignedManager(userId: string, jobId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .select({ id: job_assignments.id })
    .from(job_assignments)
    .where(and(eq(job_assignments.job_id, jobId), eq(job_assignments.manager_user_id, userId)))
    .limit(1)
    .then((r) => r[0] ?? null);
  return row !== null;
}
