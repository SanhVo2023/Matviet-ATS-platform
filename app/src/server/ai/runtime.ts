import "server-only";
import { configureAiRuntime, computeAiCost } from "@/lib/ai/workers-ai";
import { getDb } from "@/db";
import { ai_usage_log } from "@/db/schema";
import { getSetting, SETTING_KEYS } from "@/server/settings/repository";
import { checkAfterUsage } from "@/server/ai/cost-guard";
import { aiAvailability } from "@/server/ai/availability";

/**
 * Side-effect module: wires the AI provider to runtime settings (admin-chosen
 * model, kill switch) and the usage log. Import it (`import "@/server/ai/runtime"`)
 * from every module that calls the provider — missing it degrades gracefully
 * (default model, no logging), never breaks.
 */
configureAiRuntime({
  modelOverride: () => getSetting(SETTING_KEYS.aiModel),
  // AI is on unless the admin killed it OR today's spend tripped the hard cap
  // — one check shared with the scoring claim-time guard (availability.ts).
  enabledCheck: async () => (await aiAvailability()).ok,
  usageSink: (e) => {
    void (async () => {
      const db = await getDb();
      await db.insert(ai_usage_log).values({
        feature: e.feature,
        model: e.model,
        tokens_in: e.usage.in,
        tokens_out: e.usage.out,
        cost_usd: computeAiCost(e.model, e.usage.in, e.usage.out),
        user_id: e.userId ?? null,
      });
      // Soft alert / hard breaker off the inference path.
      await checkAfterUsage();
    })().catch(() => {
      // never let usage logging break inference
    });
  },
});
