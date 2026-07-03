import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { runScoringJob } from "./worker";

/**
 * Dispatch a scoring run for a candidate (ADR 0013).
 *
 * Production path: send a message to the SCORING_QUEUE — the queue consumer
 * (custom-worker.ts) gets its OWN invocation with no 30-second waitUntil cap
 * (which silently killed in-isolate runs: scoring takes 30–100s). The 1-minute
 * cron is the backstop; stale-running recovery re-claims anything dropped.
 *
 * Dev/tests (no queue binding): run detached in-process — Node keeps the
 * process alive, so the cap doesn't exist there.
 */
export function triggerScoring(candidateId: string): void {
  void (async () => {
    try {
      const { env, ctx } = await getCloudflareContext({ async: true });
      if (env.SCORING_QUEUE) {
        ctx.waitUntil(
          env.SCORING_QUEUE.send({ candidateId }).catch((err: unknown) => {
            console.warn("[scoring] queue send failed (cron will catch up):", err);
          }) as Promise<void>,
        );
        return;
      }
      // No queue binding (older env): best-effort in-isolate run.
      ctx.waitUntil(
        runScoringJob(candidateId).catch((err) => {
          console.warn("[scoring] in-isolate run failed (cron will retry):", err);
        }),
      );
    } catch {
      // Plain `next dev` / tests: detached run.
      runScoringJob(candidateId).catch((err) => {
        console.warn("[scoring] detached run failed (drain will retry):", err);
      });
    }
  })();
}

/** @deprecated Old name from the Supabase Edge Function era — same behavior. */
export const triggerEdgeFunction = triggerScoring;
