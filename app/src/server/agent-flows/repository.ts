import "server-only";
import { and, desc, eq, getTableColumns, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { agent_proposals, candidates, jobs, type ProposalKind } from "@/db/schema";

/**
 * agent_proposals data access (ADR 0020). All writes funnel through here so
 * dedupe and status transitions stay in one place. Stage SEMANTICS (which
 * kinds fit which stages) live in events.ts — this layer only stores.
 */

export interface NewProposal {
  /** null for job_from_intent — the job doesn't exist until approval. */
  jobId: string | null;
  candidateId?: string | null;
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
      kind: p.kind,
      summary: p.summary.slice(0, 300),
      reasoning: p.reasoning?.slice(0, 2000) ?? null,
      payload: p.payload,
      dedupe_key: p.dedupeKey,
    })
    .returning({ id: agent_proposals.id })
    .then((r) => r[0] ?? null);

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
};

function proposalSelect(db: Awaited<ReturnType<typeof getDb>>) {
  return db
    .select({
      ...getTableColumns(agent_proposals),
      candidate_name: candidates.full_name,
      candidate_stage: candidates.current_stage,
      candidate_archived: candidates.is_archived,
      job_title: jobs.title,
    })
    .from(agent_proposals)
    .leftJoin(candidates, eq(agent_proposals.candidate_id, candidates.id))
    .leftJoin(jobs, eq(agent_proposals.job_id, jobs.id));
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
