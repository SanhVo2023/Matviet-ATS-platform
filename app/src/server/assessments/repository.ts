import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/db";

export type AssessmentRow = Tables<"assessments">;
export type AssessmentSubmissionRow = Tables<"assessment_submissions">;
export type AssessmentInviteTokenRow = Tables<"assessment_invite_tokens">;

/**
 * Active (`is_active = true`) assessment for a job. Returns null if the job
 * has no test configured.
 */
export async function getAssessmentForJob(jobId: string): Promise<AssessmentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("job_id", jobId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as AssessmentRow | null;
}

export async function getAssessment(id: string): Promise<AssessmentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as AssessmentRow | null;
}

export async function listSubmissionsForCandidate(
  candidateId: string,
): Promise<AssessmentSubmissionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_submissions")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AssessmentSubmissionRow[];
}

export async function getSubmission(id: string): Promise<AssessmentSubmissionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as AssessmentSubmissionRow | null;
}

/**
 * Look up an invite token. Used by the public /test/[token] page server-side.
 * Goes through the admin client so the request doesn't need an auth session.
 * Returns null if expired or already used.
 */
export async function getActiveInviteToken(
  token: string,
): Promise<AssessmentInviteTokenRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assessment_invite_tokens")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) return null;
  return data as AssessmentInviteTokenRow | null;
}

/** 30-minute signed URL for downloading a test file from Storage. */
export async function signTestUrl(
  storagePath: string,
  expiresInSec = 1800,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("assessments")
    .createSignedUrl(storagePath, expiresInSec);
  if (error) return null;
  return data.signedUrl;
}

/** 30-minute signed URL for downloading a candidate's answer file. */
export async function signSubmissionUrl(
  storagePath: string,
  expiresInSec = 1800,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("submissions")
    .createSignedUrl(storagePath, expiresInSec);
  if (error) return null;
  return data.signedUrl;
}
