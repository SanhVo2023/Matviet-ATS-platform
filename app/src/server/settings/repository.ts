import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { app_settings } from "@/db/schema";

/**
 * Runtime settings (admin-editable, D1-backed) with a short per-isolate cache
 * so hot paths (every AI call reads ai_model/ai_enabled) don't pay a D1
 * round-trip each time.
 */

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: string | null; at: number }>();

export async function getSetting(key: string): Promise<string | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const db = await getDb();
  const row = await db
    .select({ value: app_settings.value })
    .from(app_settings)
    .where(eq(app_settings.key, key))
    .get();
  const value = row?.value ?? null;
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db
    .insert(app_settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: [app_settings.key],
      set: { value, updated_at: new Date().toISOString() },
    });
  cache.set(key, { value, at: Date.now() });
}

/** Known keys (documented for the admin UI). */
export const SETTING_KEYS = {
  aiModel: "ai_model",
  aiEnabled: "ai_enabled", // "true" | "false"
} as const;
