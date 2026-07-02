import "server-only";
import { and, eq, isNotNull, like } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, jobs } from "@/db/schema";
import { normalizePhone } from "@/lib/validation/csv-import";

/**
 * Find any non-archived candidate in the same job whose email or normalized
 * phone matches the input. Used by the CSV import preview to flag duplicates.
 *
 * The import wizard needs to scan ALL existing candidates of the job — the
 * calling Server Action is already requireRole-guarded so authorization isn't
 * bypassed (single-principal D1, ADR 0011).
 */
export async function findExistingByEmailOrPhone(
  jobId: string,
  email: string | null,
  phone: string | null,
): Promise<{ id: string; full_name: string } | null> {
  const db = await getDb();
  const normalizedPhone = normalizePhone(phone);

  // First try email — most reliable. LIKE without wildcards = case-insensitive
  // equality in SQLite (same behavior the old ilike gave us on Postgres).
  if (email) {
    const rows = await db
      .select({ id: candidates.id, full_name: candidates.full_name })
      .from(candidates)
      .where(
        and(
          eq(candidates.job_id, jobId),
          eq(candidates.is_archived, false),
          like(candidates.email, email),
        ),
      )
      .limit(1);
    if (rows[0]) return rows[0];
  }

  // Phone fallback — fetch candidates with non-null phones for the job and
  // compare normalized client-side. SQL-side regex would be faster but the
  // volumes here (≤ 500 per job) make this trivial.
  if (normalizedPhone) {
    const rows = await db
      .select({ id: candidates.id, full_name: candidates.full_name, phone: candidates.phone })
      .from(candidates)
      .where(
        and(
          eq(candidates.job_id, jobId),
          eq(candidates.is_archived, false),
          isNotNull(candidates.phone),
        ),
      );
    const hit = rows.find((r) => normalizePhone(r.phone) === normalizedPhone);
    if (hit) return { id: hit.id, full_name: hit.full_name };
  }

  return null;
}

/** Lookup the job title for the import wizard preview header. */
export async function lookupJobName(jobId: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select({ title: jobs.title }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return rows[0]?.title ?? null;
}
