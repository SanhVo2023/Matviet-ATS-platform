import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/validation/csv-import";

/**
 * Find any non-archived candidate in the same job whose email or normalized
 * phone matches the input. Used by the CSV import preview to flag duplicates.
 *
 * Goes through admin client because the import wizard needs to scan ALL
 * existing candidates of the job, not just ones the current user has RLS
 * visibility into (HR/admin would see everything anyway, but this keeps the
 * code uniform regardless of caller role — the calling Server Action is
 * already requireRole-guarded so authorization isn't bypassed).
 */
export async function findExistingByEmailOrPhone(
  jobId: string,
  email: string | null,
  phone: string | null,
): Promise<{ id: string; full_name: string } | null> {
  const admin = createAdminClient();
  const normalizedPhone = normalizePhone(phone);

  // First try email — most reliable.
  if (email) {
    const { data } = await admin
      .from("candidates")
      .select("id, full_name")
      .eq("job_id", jobId)
      .eq("is_archived", false)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (data) return data as { id: string; full_name: string };
  }

  // Phone fallback — fetch candidates with non-null phones for the job and
  // compare normalized client-side. Postgres-side regex would be faster but
  // the volumes here (≤ 500 per job) make this trivial.
  if (normalizedPhone) {
    const { data } = await admin
      .from("candidates")
      .select("id, full_name, phone")
      .eq("job_id", jobId)
      .eq("is_archived", false)
      .not("phone", "is", null);
    const rows = (data ?? []) as Array<{ id: string; full_name: string; phone: string | null }>;
    const hit = rows.find((r) => normalizePhone(r.phone) === normalizedPhone);
    if (hit) return { id: hit.id, full_name: hit.full_name };
  }

  return null;
}

/** Lookup the job title for the import wizard preview header. */
export async function lookupJobName(jobId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("jobs").select("title").eq("id", jobId).maybeSingle();
  return (data as { title: string } | null)?.title ?? null;
}
