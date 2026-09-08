import "server-only";
import { and, eq, isNotNull, lte, ne, sql, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { employees, contracts, leave_requests, candidates } from "@/db/schema";

/**
 * HRM snapshot for the HR dashboard (UX audit 2026-09-08: the HRM half was
 * invisible on chị Hương's landing page). Four numbers that need her hand
 * this week, plus what the assistant is "watching" for the feed's empty state.
 */
export interface HrmSnapshot {
  /** Non-terminated employees. */
  headcount: number;
  /** thử việc contracts ending within 7 days (active). */
  probationEnding7d: number;
  /** Fixed-term contracts ending within 30 days (active). */
  contractsExpiring30d: number;
  /** Leave requests awaiting a decision. */
  pendingLeave: number;
  /** Open (non-terminal) candidates the hiring agent watches. */
  activeCandidates: number;
}

const isoPlusDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export async function getHrmSnapshot(): Promise<HrmSnapshot> {
  const db = await getDb();
  const [headcount, probation, expiring, pendingLeave, activeCandidates] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)` })
      .from(employees)
      .where(ne(employees.status, "terminated"))
      .then((r) => Number(r[0]?.n ?? 0)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(contracts)
      .where(
        and(
          eq(contracts.status, "active"),
          eq(contracts.type, "thu_viec"),
          isNotNull(contracts.end_date),
          lte(contracts.end_date, isoPlusDays(7)),
        ),
      )
      .then((r) => Number(r[0]?.n ?? 0)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(contracts)
      .where(
        and(
          eq(contracts.status, "active"),
          eq(contracts.type, "xac_dinh_thoi_han"),
          isNotNull(contracts.end_date),
          lte(contracts.end_date, isoPlusDays(30)),
        ),
      )
      .then((r) => Number(r[0]?.n ?? 0)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(leave_requests)
      .where(eq(leave_requests.status, "pending"))
      .then((r) => Number(r[0]?.n ?? 0)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(candidates)
      .where(
        and(
          eq(candidates.is_archived, false),
          inArray(candidates.current_stage, [
            "intake",
            "evaluating",
            "approving",
            "offer",
            "offer_accepted",
          ]),
        ),
      )
      .then((r) => Number(r[0]?.n ?? 0)),
  ]);

  return {
    headcount,
    probationEnding7d: probation,
    contractsExpiring30d: expiring,
    pendingLeave,
    activeCandidates,
  };
}
