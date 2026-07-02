import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { runScoringJob } from "./worker";

/**
 * Fire-and-forget dispatch of an in-process scoring run (ADR 0009 — the
 * Supabase Edge Function is gone; scoring executes inside this Worker).
 *
 * Server Actions call this AFTER enqueueScoring. `ctx.waitUntil` keeps the
 * isolate alive past the response so the 15–30s Gemini round-trips finish.
 * The every-5-min cron drain is the safety net if the isolate is still cut
 * short (the queue's stale-running recovery re-claims orphans).
 */
export function triggerScoring(candidateId: string): void {
  void (async () => {
    try {
      const { ctx } = await getCloudflareContext({ async: true });
      ctx.waitUntil(
        runScoringJob(candidateId).catch((err) => {
          console.warn("[scoring] in-process run failed (drain will retry):", err);
        }),
      );
    } catch {
      // Not on Workers (plain `next dev` without bindings, or tests):
      // run detached — Node keeps the process alive.
      runScoringJob(candidateId).catch((err) => {
        console.warn("[scoring] detached run failed (drain will retry):", err);
      });
    }
  })();
}

/** @deprecated Old name from the Supabase Edge Function era — same behavior. */
export const triggerEdgeFunction = triggerScoring;
