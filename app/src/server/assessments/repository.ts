import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { assessments, assessment_submissions, assessment_invite_tokens } from "@/db/schema";
import type { Tables } from "@/types/db";

export type AssessmentRow = Tables<"assessments">;
export type AssessmentSubmissionRow = Tables<"assessment_submissions">;
export type AssessmentInviteTokenRow = Tables<"assessment_invite_tokens">;

/**
 * Active (`is_active = true`) assessment for a job. Returns null if the job
 * has no test configured.
 */
export async function getAssessmentForJob(jobId: string): Promise<AssessmentRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.job_id, jobId), eq(assessments.is_active, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAssessment(id: string): Promise<AssessmentRow | null> {
  const db = await getDb();
  const rows = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listSubmissionsForCandidate(
  candidateId: string,
): Promise<AssessmentSubmissionRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(assessment_submissions)
    .where(eq(assessment_submissions.candidate_id, candidateId))
    .orderBy(desc(assessment_submissions.created_at));
}

export async function getSubmission(id: string): Promise<AssessmentSubmissionRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(assessment_submissions)
    .where(eq(assessment_submissions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Look up an invite token. Used by the public /test/[token] page server-side
 * (no auth session required — authorization is the token itself).
 * Returns null if expired or already used.
 */
export async function getActiveInviteToken(
  token: string,
): Promise<AssessmentInviteTokenRow | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(assessment_invite_tokens)
      .where(
        and(
          eq(assessment_invite_tokens.token, token),
          isNull(assessment_invite_tokens.used_at),
          gt(assessment_invite_tokens.expires_at, new Date().toISOString()),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Staff-only download URL for a test file (served by /api/files, which
 * enforces the session). Replaces the old Supabase 30-min signed URL.
 */
export async function signTestUrl(
  storagePath: string,
  _expiresInSec = 1800,
): Promise<string | null> {
  return "/api/files/" + storagePath.split("/").map(encodeURIComponent).join("/");
}

/**
 * Staff-only download URL for a candidate's answer file (served by /api/files,
 * which enforces the session). Replaces the old Supabase 30-min signed URL.
 */
export async function signSubmissionUrl(
  storagePath: string,
  _expiresInSec = 1800,
): Promise<string | null> {
  return "/api/files/" + storagePath.split("/").map(encodeURIComponent).join("/");
}
