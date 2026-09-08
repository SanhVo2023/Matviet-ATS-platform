import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  agent_proposals,
  candidates,
  jobs,
  employees,
  people,
  job_assignments,
  type ProposalKind,
} from "@/db/schema";

/**
 * agent_proposals data access (ADR 0020). All writes funnel through here so
 * dedupe and status transitions stay in one place. Stage SEMANTICS (which
 * kinds fit which stages) live in events.ts — this layer only stores.
 */

export interface NewProposal {
  /** null for job_from_intent — the job doesn't exist until approval. */
  jobId: string | null;
  candidateId?: string | null;
  /** HRM H1 — set for employee-lifecycle proposals (onboarding/probation/contract). */
  employeeId?: string | null;
  kind: ProposalKind;
  summary: string;
  reasoning?: string | null;
  payload: Record<string, unknown>;
  dedupeKey: string;
}

/**
 * Insert unless a twin exists. Rules:
 * - `proposed`/`approved` twin with the same dedupe_key → skip (on the feed
 *   or mid-execution)
 * - `executed`/`dismissed` twin → skip (HR already acted; don't nag).
 * `superseded`/`failed` don't block — the situation changed or the execution
 * needs another try.
 */
export async function createProposal(p: NewProposal): Promise<{ id: string } | null> {
  const db = await getDb();
  const twin = await db
    .select({ id: agent_proposals.id })
    .from(agent_proposals)
    .where(
      and(
        eq(agent_proposals.dedupe_key, p.dedupeKey),
        inArray(agent_proposals.status, ["proposed", "approved", "executed", "dismissed"]),
      ),
    )
    .limit(1)
    .then((r) => r[0] ?? null);
  if (twin) return null;

  const row = await db
    .insert(agent_proposals)
    .values({
      job_id: p.jobId,
      candidate_id: p.candidateId ?? null,
      employee_id: p.employeeId ?? null,
      kind: p.kind,
      summary: p.summary.slice(0, 300),
      reasoning: p.reasoning?.slice(0, 2000) ?? null,
      payload: p.payload,
      dedupe_key: p.dedupeKey,
    })
    .returning({ id: agent_proposals.id })
    .then((r) => r[0] ?? null)
    .catch((err: unknown) => {
      // Lost the race to a concurrent twin (uq_proposals_open_dedupe) — same
      // outcome as the pre-check: nothing to add.
      if (String(err).includes("UNIQUE")) return null;
      throw err;
    });

  if (row) {
    // Bell: a new card is waiting on the Hôm nay feed. Error-swallowing by
    // notifications contract; lazily imported to keep the layer edge thin.
    const { notifyRoles } = await import("@/server/notifications/service");
    await notifyRoles(["hr", "admin"], {
      type: "agent_proposal",
      title: "Trợ lý đề xuất: " + p.summary.slice(0, 120),
      body: "Xem và duyệt trên trang chính",
      link: "/",
    });
  }
  return row;
}

export type ProposalRow = typeof agent_proposals.$inferSelect & {
  candidate_name: string | null;
  candidate_stage: string | null;
  candidate_archived: boolean | null;
  job_title: string | null;
  employee_name: string | null;
  employee_department_id: string | null;
};

function proposalSelect(db: Awaited<ReturnType<typeof getDb>>) {
  return db
    .select({
      ...getTableColumns(agent_proposals),
      candidate_name: candidates.full_name,
      candidate_stage: candidates.current_stage,
      candidate_archived: candidates.is_archived,
      job_title: jobs.title,
      employee_name: people.full_name,
      employee_department_id: employees.department_id,
    })
    .from(agent_proposals)
    .leftJoin(candidates, eq(agent_proposals.candidate_id, candidates.id))
    .leftJoin(jobs, eq(agent_proposals.job_id, jobs.id))
    .leftJoin(employees, eq(agent_proposals.employee_id, employees.id))
    .leftJoin(people, eq(employees.person_id, people.id));
}

/**
 * Open proposals for the feed, newest first. Cards whose candidate or job
 * was archived are hidden (belt — archive/close also supersedes them).
 */
export async function listOpenProposals(limit = 30): Promise<ProposalRow[]> {
  const db = await getDb();
  return proposalSelect(db)
    .where(
      and(
        eq(agent_proposals.status, "proposed"),
        or(isNull(agent_proposals.candidate_id), eq(candidates.is_archived, false)),
        or(isNull(agent_proposals.job_id), eq(jobs.is_archived, false)),
      ),
    )
    .orderBy(desc(agent_proposals.created_at))
    .limit(limit) as Promise<ProposalRow[]>;
}

/**
 * A hiring manager's slice of the feed (UX audit 2026-09-08 — managers never
 * saw the feed, so the leave cards addressed to them were invisible): cards
 * for jobs they're assigned to + employee cards (leave, probation, contract)
 * in their department.
 */
export async function listOpenProposalsForManager(
  userId: string,
  departmentId: string | null,
  limit = 30,
): Promise<ProposalRow[]> {
  const db = await getDb();
  const assigned = await db
    .select({ job_id: job_assignments.job_id })
    .from(job_assignments)
    .where(eq(job_assignments.manager_user_id, userId));
  const jobIds = assigned.map((a) => a.job_id);

  const scope = [];
  if (jobIds.length > 0) {
    scope.push(and(inArray(agent_proposals.job_id, jobIds), eq(candidates.is_archived, false)));
  }
  if (departmentId) {
    scope.push(
      and(isNotNull(agent_proposals.employee_id), eq(employees.department_id, departmentId)),
    );
  }
  if (scope.length === 0) return [];

  return proposalSelect(db)
    .where(and(eq(agent_proposals.status, "proposed"), or(...scope)))
    .orderBy(desc(agent_proposals.created_at))
    .limit(limit) as Promise<ProposalRow[]>;
}

/** Server-side scope check for a manager's approve/dismiss — never trust the UI. */
export async function isProposalInManagerScope(
  proposalId: string,
  userId: string,
  departmentId: string | null,
): Promise<boolean> {
  const rows = await listOpenProposalsForManager(userId, departmentId, 500);
  return rows.some((p) => p.id === proposalId);
}

export async function getProposal(id: string): Promise<ProposalRow | null> {
  const db = await getDb();
  const rows = (await proposalSelect(db)
    .where(eq(agent_proposals.id, id))
    .limit(1)) as ProposalRow[];
  return rows[0] ?? null;
}

/**
 * Atomically claim a proposal for execution (proposed → approved). Returns
 * false when someone else already claimed/decided it — protects against
 * double-taps AND against a concurrent reconcile superseding the row while
 * the execution's own side effects are in flight.
 */
export async function claimProposal(id: string, actorId: string): Promise<boolean> {
  const db = await getDb();
  const r = await db
    .update(agent_proposals)
    .set({ status: "approved", decided_by: actorId, decided_at: new Date().toISOString() })
    .where(and(eq(agent_proposals.id, id), eq(agent_proposals.status, "proposed")))
    .returning({ id: agent_proposals.id });
  return r.length > 0;
}

/** proposed → dismissed (guarded on still-open). */
export async function dismissProposal(id: string, actorId: string): Promise<boolean> {
  const db = await getDb();
  const r = await db
    .update(agent_proposals)
    .set({ status: "dismissed", decided_by: actorId, decided_at: new Date().toISOString() })
    .where(and(eq(agent_proposals.id, id), eq(agent_proposals.status, "proposed")))
    .returning({ id: agent_proposals.id });
  return r.length > 0;
}

/** Terminal transition after an execution attempt (guarded on the claim). */
export async function markProposalOutcome(
  id: string,
  actorId: string,
  outcome:
    | { status: "executed"; executedRef: Record<string, string> }
    | { status: "failed"; error: string },
): Promise<boolean> {
  const db = await getDb();
  const r = await db
    .update(agent_proposals)
    .set({
      status: outcome.status,
      decided_by: actorId,
      decided_at: new Date().toISOString(),
      ...(outcome.status === "executed"
        ? { executed_ref: outcome.executedRef }
        : { error: outcome.error.slice(0, 500) }),
    })
    .where(and(eq(agent_proposals.id, id), eq(agent_proposals.status, "approved")))
    .returning({ id: agent_proposals.id });
  return r.length > 0;
}

/** Open proposals for one candidate (reconcile input — events.ts decides). */
export async function listOpenProposalsForCandidate(
  candidateId: string,
): Promise<Array<{ id: string; kind: ProposalKind }>> {
  const db = await getDb();
  const rows = await db
    .select({ id: agent_proposals.id, kind: agent_proposals.kind })
    .from(agent_proposals)
    .where(
      and(eq(agent_proposals.candidate_id, candidateId), eq(agent_proposals.status, "proposed")),
    );
  return rows as Array<{ id: string; kind: ProposalKind }>;
}

/** Job closed/archived → every open card under it leaves the feed. */
export async function supersedeOpenProposalsForJob(jobId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(agent_proposals)
    .set({ status: "superseded", decided_at: new Date().toISOString() })
    .where(and(eq(agent_proposals.job_id, jobId), eq(agent_proposals.status, "proposed")));
}

/**
 * Supersede an open proposal by its dedupe_key — used when the proposed act is
 * decided OUTSIDE the feed (e.g. a leave request approved/denied on its page),
 * so the stale card leaves the "Hôm nay" feed.
 */
export async function supersedeProposalByDedupeKey(dedupeKey: string): Promise<void> {
  const db = await getDb();
  await db
    .update(agent_proposals)
    .set({ status: "superseded", decided_at: new Date().toISOString() })
    .where(and(eq(agent_proposals.dedupe_key, dedupeKey), eq(agent_proposals.status, "proposed")));
}

/** Mark specific open proposals superseded (only touches `proposed` rows). */
export async function supersedeProposals(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db
    .update(agent_proposals)
    .set({ status: "superseded", decided_at: new Date().toISOString() })
    .where(and(inArray(agent_proposals.id, ids), eq(agent_proposals.status, "proposed")));
}

/**
 * Close open proposals of a kind for a candidate after the proposed act
 * happened OUTSIDE the feed (e.g. HR composed the offer email from the
 * candidate page — the compose_offer card is now done).
 */
export async function completeOpenProposals(
  candidateId: string,
  kind: ProposalKind,
  executedRef: Record<string, string>,
): Promise<void> {
  const db = await getDb();
  await db
    .update(agent_proposals)
    .set({ status: "executed", decided_at: new Date().toISOString(), executed_ref: executedRef })
    .where(
      and(
        eq(agent_proposals.candidate_id, candidateId),
        eq(agent_proposals.kind, kind),
        eq(agent_proposals.status, "proposed"),
      ),
    );
}

/** Feed badge count for the TopBar. */
export async function countOpenProposals(): Promise<number> {
  const db = await getDb();
  const row = await db
    .select({ n: sql<number>`count(*)` })
    .from(agent_proposals)
    .where(eq(agent_proposals.status, "proposed"))
    .then((r) => r[0] ?? null);
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Run log / health (agentic audit P1) — what the assistant proposed, what
// humans did with it, and what broke. Read by the admin system page.
// ---------------------------------------------------------------------------

export interface ProposalKindStat {
  kind: string;
  proposed: number;
  executed: number;
  failed: number;
  dismissed: number;
  superseded: number;
}

export interface ProposalStats {
  window_days: number;
  total: number;
  open: number;
  executed: number;
  dismissed: number;
  failed: number;
  superseded: number;
  /** executed / (executed + dismissed) — how often a card was worth showing. */
  acceptance_rate: number | null;
  oldest_open_at: string | null;
  by_kind: ProposalKindStat[];
  recent_failures: Array<{
    id: string;
    kind: string;
    summary: string;
    error: string | null;
    decided_at: string | null;
  }>;
}

export async function proposalStats(windowDays = 30): Promise<ProposalStats> {
  const db = await getDb();
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

  const grouped = await db
    .select({
      kind: agent_proposals.kind,
      status: agent_proposals.status,
      n: sql<number>`count(*)`,
    })
    .from(agent_proposals)
    .where(gte(agent_proposals.created_at, since))
    .groupBy(agent_proposals.kind, agent_proposals.status);

  const byKind = new Map<string, ProposalKindStat>();
  const totals = { total: 0, open: 0, executed: 0, dismissed: 0, failed: 0, superseded: 0 };
  for (const g of grouped) {
    const n = Number(g.n);
    const k =
      byKind.get(g.kind) ??
      ({
        kind: g.kind,
        proposed: 0,
        executed: 0,
        failed: 0,
        dismissed: 0,
        superseded: 0,
      } as ProposalKindStat);
    k.proposed += n;
    totals.total += n;
    if (g.status === "proposed" || g.status === "approved") totals.open += n;
    else if (g.status === "executed") {
      k.executed += n;
      totals.executed += n;
    } else if (g.status === "failed") {
      k.failed += n;
      totals.failed += n;
    } else if (g.status === "dismissed") {
      k.dismissed += n;
      totals.dismissed += n;
    } else if (g.status === "superseded") {
      k.superseded += n;
      totals.superseded += n;
    }
    byKind.set(g.kind, k);
  }

  const oldestOpen = await db
    .select({ created_at: agent_proposals.created_at })
    .from(agent_proposals)
    .where(eq(agent_proposals.status, "proposed"))
    .orderBy(asc(agent_proposals.created_at))
    .limit(1)
    .then((r) => r[0]?.created_at ?? null);

  const recentFailures = await db
    .select({
      id: agent_proposals.id,
      kind: agent_proposals.kind,
      summary: agent_proposals.summary,
      error: agent_proposals.error,
      decided_at: agent_proposals.decided_at,
    })
    .from(agent_proposals)
    .where(eq(agent_proposals.status, "failed"))
    .orderBy(desc(agent_proposals.decided_at))
    .limit(5);

  const decided = totals.executed + totals.dismissed;
  return {
    window_days: windowDays,
    ...totals,
    acceptance_rate: decided > 0 ? totals.executed / decided : null,
    oldest_open_at: oldestOpen,
    by_kind: [...byKind.values()].sort((a, b) => b.proposed - a.proposed),
    recent_failures: recentFailures,
  };
}
