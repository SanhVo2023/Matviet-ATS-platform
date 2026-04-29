import "server-only";
import { publicEnv } from "@/types/env";

/**
 * Fire-and-forget POST to the score-candidate Edge Function.
 *
 * Server Actions and the cron drain call this AFTER enqueueScoring. We don't
 * await the response — Gemini takes 15-30s and the user's request should
 * already have returned. The Edge Function is the source of truth; the
 * /api/scoring/drain cron is the safety net if this dispatch is dropped.
 */
export function triggerEdgeFunction(candidateId: string): void {
  const url = `${publicEnv.supabaseUrl}/functions/v1/score-candidate`;
  const secret = process.env.SCORING_INTERNAL_SECRET;
  if (!secret) {
    // Don't throw — the drain cron will catch up. Log for ops visibility.
    console.warn("[scoring] SCORING_INTERNAL_SECRET missing; skipping Edge Function dispatch");
    return;
  }
  // Intentionally NOT awaited. Use fetch with keepalive so it survives the
  // request lifetime in serverless environments.
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ candidate_id: candidateId }),
    keepalive: true,
  }).catch((err) => {
    console.warn("[scoring] Edge Function dispatch failed (drain will retry):", err);
  });
}
