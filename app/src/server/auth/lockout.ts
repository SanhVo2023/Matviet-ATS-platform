/**
 * Per-email login lockout (renovation R0, task 1.7).
 *
 * better-auth's IP rate limit is the flood gate; this ledger is the
 * targeted-guessing gate: 5 wrong passwords for ONE email inside 15 minutes
 * locks that email for 15 minutes, doubling on every subsequent lock, capped
 * at 2 hours. Success clears the ledger. Policy is pure (`computeNextOnFailure`,
 * `lockRemainingMs`) so it unit-tests without D1.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { login_attempts } from "@/db/schema";

const WINDOW_MS = 15 * 60_000;
const THRESHOLD = 5;
const BASE_LOCK_MS = 15 * 60_000;
const MAX_LOCK_MS = 2 * 60 * 60_000;

export interface AttemptRow {
  fail_count: number;
  last_fail_at: string | null;
  locked_until: string | null;
}

/** ms until the lock expires; 0 when not locked. */
export function lockRemainingMs(row: AttemptRow | null, nowMs: number): number {
  if (!row?.locked_until) return 0;
  return Math.max(0, Date.parse(row.locked_until) - nowMs);
}

/** Next ledger state after one more failed attempt at `nowMs`. */
export function computeNextOnFailure(prev: AttemptRow | null, nowMs: number): AttemptRow {
  // Window anchors on the latest of last failure / last lock expiry, so a
  // failure right after a lock ends continues the escalation instead of
  // resetting it.
  const anchor = prev
    ? Math.max(
        prev.last_fail_at ? Date.parse(prev.last_fail_at) : 0,
        prev.locked_until ? Date.parse(prev.locked_until) : 0,
      )
    : 0;
  const inWindow = anchor > 0 && nowMs - anchor <= WINDOW_MS;
  const fail_count = (inWindow ? (prev?.fail_count ?? 0) : 0) + 1;

  let locked_until: string | null = null;
  if (fail_count >= THRESHOLD && fail_count % THRESHOLD === 0) {
    const lockIndex = Math.floor(fail_count / THRESHOLD);
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** (lockIndex - 1), MAX_LOCK_MS);
    locked_until = new Date(nowMs + lockMs).toISOString();
  }
  return { fail_count, last_fail_at: new Date(nowMs).toISOString(), locked_until };
}

const normalize = (email: string) => email.trim().toLowerCase();

/** Remaining lock in minutes (rounded up); 0 = not locked. */
export async function checkLockout(email: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(login_attempts)
    .where(eq(login_attempts.email, normalize(email)))
    .limit(1);
  const remaining = lockRemainingMs(rows[0] ?? null, Date.now());
  return remaining > 0 ? Math.ceil(remaining / 60_000) : 0;
}

export async function recordFailure(email: string): Promise<void> {
  const db = await getDb();
  const key = normalize(email);
  const rows = await db.select().from(login_attempts).where(eq(login_attempts.email, key)).limit(1);
  const next = computeNextOnFailure(rows[0] ?? null, Date.now());
  await db
    .insert(login_attempts)
    .values({ email: key, ...next })
    .onConflictDoUpdate({ target: login_attempts.email, set: next });
}

export async function clearFailures(email: string): Promise<void> {
  const db = await getDb();
  await db.delete(login_attempts).where(eq(login_attempts.email, normalize(email)));
}
