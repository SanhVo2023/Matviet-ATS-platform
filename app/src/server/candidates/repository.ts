import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Tables } from "@/types/db";

export type CandidateRow = Tables<"candidates">;
export type CvFileRow = Tables<"cv_files">;
export type StageHistoryRow = Tables<"stage_history">;
export type Stage = Database["public"]["Enums"]["pipeline_stage"];
export type Source = Database["public"]["Enums"]["candidate_source"];

export interface CandidateListFilters {
  job_id?: string | null;
  stage?: Stage | "all";
  source?: Source | "all";
  search?: string;
}

export async function listCandidates(filters: CandidateListFilters = {}): Promise<CandidateRow[]> {
  const supabase = await createClient();
  let q = supabase.from("candidates").select("*").eq("is_archived", false);

  if (filters.job_id) q = q.eq("job_id", filters.job_id);
  if (filters.stage && filters.stage !== "all") q = q.eq("current_stage", filters.stage);
  if (filters.source && filters.source !== "all") q = q.eq("source", filters.source);
  if (filters.search?.trim()) {
    const s = filters.search.trim();
    q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CandidateRow[];
}

export async function getCandidate(id: string): Promise<CandidateRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("candidates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as CandidateRow | null;
}

export async function getCvFile(cvFileId: string): Promise<CvFileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cv_files")
    .select("*")
    .eq("id", cvFileId)
    .maybeSingle();
  if (error) throw error;
  return data as CvFileRow | null;
}

export async function getStageHistory(candidateId: string): Promise<StageHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_history")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StageHistoryRow[];
}

/**
 * Generate a signed URL for a CV file (10-minute expiry). Used by the
 * CV preview component which fetches the bytes client-side.
 */
export async function signCvUrl(storagePath: string, expiresInSec = 600): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("cvs")
    .createSignedUrl(storagePath, expiresInSec);
  if (error) return null;
  return data.signedUrl;
}

/**
 * Bulk lookup of profiles for stage history actor display. Uses admin client
 * because RLS on profiles only lets users see themselves; HR detail page
 * legitimately needs to render names of past actors.
 */
export async function lookupProfileNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, full_name").in("id", ids);
  return Object.fromEntries(
    ((data ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [
      p.id,
      p.full_name ?? "—",
    ]),
  );
}
