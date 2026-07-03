import "server-only";
import { configureAiRuntime, computeAiCost } from "@/lib/ai/workers-ai";
import { getDb } from "@/db";
import { ai_usage_log } from "@/db/schema";
import { getSetting, SETTING_KEYS } from "@/server/settings/repository";

/**
 * Side-effect module: wires the AI provider to runtime settings (admin-chosen
 * model, kill switch) and the usage log. Import it (`import "@/server/ai/runtime"`)
 * from every module that calls the provider — missing it degrades gracefully
 * (default model, no logging), never breaks.
 */
configureAiRuntime({
  modelOverride: () => getSetting(SETTING_KEYS.aiModel),
  enabledCheck: async () => (await getSetting(SETTING_KEYS.aiEnabled)) !== "false",
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
    })().catch(() => {
      // never let usage logging break inference
    });
  },
});
