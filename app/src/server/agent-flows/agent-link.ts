import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Next-ctx → HiringAgent DO bridge (ADR 0020). Emitters call this on every
 * pipeline event so the job's agent can (re)arm its follow-up timer for the
 * candidate. Stage semantics stay HERE (Next ctx): the caller decides the
 * check delay; the DO only remembers and fires.
 *
 * Deliberately does NOT import the `agents` package: webpack cannot bundle
 * its `cloudflare:*` scheme imports into the Next server build. Instead we
 * talk to the DO through the raw stub's fetch() and the agent's internal
 * `onRequest` surface (src/agents/hiring-agent.ts) — unreachable publicly.
 *
 * Never throws — agent orchestration must not break the business flow that
 * triggered it (same contract as notifications).
 */

function agentStub(jobId: string): { fetch: typeof fetch } | null {
  const { env } = getCloudflareContext();
  const ns = env.HIRING_AGENT as unknown as
    | {
        idFromName(name: string): unknown;
        get(id: unknown): { fetch: typeof fetch };
      }
    | undefined;
  if (!ns) return null; // binding absent (e.g. plain `next dev`)
  return ns.get(ns.idFromName(jobId));
}

export async function pingHiringAgent(e: {
  jobId: string;
  candidateId: string;
  stage: string;
  /** Seconds until a stale check, or null to stop watching this candidate. */
  checkAfterSeconds: number | null;
}): Promise<void> {
  try {
    const stub = agentStub(e.jobId);
    if (!stub) return;
    const res = await stub.fetch("https://hiring-agent.internal/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        candidateId: e.candidateId,
        stage: e.stage,
        checkAfterSeconds: e.checkAfterSeconds,
      }),
    });
    if (res.status !== 200) {
      console.error(`[agent-link] event -> ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("[agent-link] pingHiringAgent failed:", err);
  }
}

/** Debug/ops: read a job agent's watch state + pending timers (null on error). */
export async function snapshotHiringAgent(jobId: string): Promise<unknown | null> {
  try {
    const stub = agentStub(jobId);
    if (!stub) return null;
    const res = await stub.fetch("https://hiring-agent.internal/snapshot");
    if (res.status !== 200) return null;
    return await res.json();
  } catch (err) {
    console.error("[agent-link] snapshotHiringAgent failed:", err);
    return null;
  }
}
