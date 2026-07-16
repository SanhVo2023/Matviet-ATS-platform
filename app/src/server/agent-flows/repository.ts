import "server-only";
import { and, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { agent_proposals, candidates, jobs, type ProposalKind } from "@/db/schema";

/**
 * agent_proposals data access (ADR 0020). All writes funnel through here so
 * dedupe and status transitions stay in one place.
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
 * Insert unless an open/decided twin exists. Rules:
 * - an open (`proposed`) row with the same dedupe_key → skip (still on the feed)
 * - an `executed`/`dismissed` row with the same key → skip (HR already acted;
 *   don't nag). `superseded`/`failed` rows do NOT block — the situation changed
 *   or the execution needs another try.
 */
export async function createProposal(p: NewProposal): Promise<{ id: string } | null> {
  const db = await getDb();
  const twin = await db
    .select({ id: agent_proposals.id })
    .from(agent_proposals)
    .where(
      and(
        eq(agent_proposals.dedupe_key, p.dedupeKey),
        inArray(agent_proposals.status, ["proposed", "executed", "dismissed"]),
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
  job_title: string | null;
};

/** Open proposals for the feed, newest first, with display joins. */
export async function listOpenProposals(limit = 30): Promise<ProposalRow[]> {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(agent_proposals),
      candidate_name: candidates.full_name,
      candidate_stage: candidates.current_stage,
      job_title: jobs.title,
    })
    .from(agent_proposals)
    .leftJoin(candidates, eq(agent_proposals.candidate_id, candidates.id))
    .leftJoin(jobs, eq(agent_proposals.job_id, jobs.id))
    .where(eq(agent_proposals.status, "proposed"))
    .orderBy(desc(agent_proposals.created_at))
    .limit(limit) as Promise<ProposalRow[]>;
}

export async function getProposal(id: string): Promise<ProposalRow | null> {
  const db = await getDb();
  const rows = (await db
    .select({
      ...getTableColumns(agent_proposals),
      candidate_name: candidates.full_name,
      candidate_stage: candidates.current_stage,
      job_title: jobs.title,
    })
    .from(agent_proposals)
    .leftJoin(candidates, eq(agent_proposals.candidate_id, candidates.id))
    .leftJoin(jobs, eq(agent_proposals.job_id, jobs.id))
    .where(eq(agent_proposals.id, id))
    .limit(1)) as ProposalRow[];
  return rows[0] ?? null;
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

/** Terminal transition after an execution attempt (guarded on still-open). */
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
    .where(and(eq(agent_proposals.id, id), eq(agent_proposals.status, "proposed")))
    .returning({ id: agent_proposals.id });
  return r.length > 0;
}

/**
 * Stage moved on → open proposals whose kind no longer fits the candidate's
 * situation get marked `superseded` (they silently leave the feed).
 */
const VALID_STAGES_BY_KIND: Record<ProposalKind, string[]> = {
  interview_invite: ["screened", "new", "screening"],
  start_approval: ["interviewed", "test_sent", "test_done"],
  compose_offer: ["offer_sent"],
  nudge_stale: [], // stage recorded in dedupe_key; any stage change supersedes
  job_from_intent: [], // job-level; never candidate-stage-bound
};

export async function reconcileOpenProposals(
  candidateId: string,
  currentStage: string,
): Promise<void> {
  const db = await getDb();
  const open = await db
    .select({ id: agent_proposals.id, kind: agent_proposals.kind })
    .from(agent_proposals)
    .where(
      and(eq(agent_proposals.candidate_id, candidateId), eq(agent_proposals.status, "proposed")),
    );
  const stale = open.filter((p) => {
    if (p.kind === "job_from_intent") return false;
    if (p.kind === "nudge_stale") return true; // any movement voids a stale nudge
    return !VALID_STAGES_BY_KIND[p.kind as ProposalKind].includes(currentStage);
  });
  if (stale.length === 0) return;
  await db
    .update(agent_proposals)
    .set({ status: "superseded", decided_at: new Date().toISOString() })
    .where(
      inArray(
        agent_proposals.id,
        stale.map((s) => s.id),
      ),
    );
}

/** Feed badge count for the TopBar. */
export async function countOpenProposals(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: agent_proposals.id })
    .from(agent_proposals)
    .where(eq(agent_proposals.status, "proposed"));
  return rows.length;
}
