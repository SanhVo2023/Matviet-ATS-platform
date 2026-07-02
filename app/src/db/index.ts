import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

/**
 * The single DB accessor (ADR 0011: one principal, no anon/admin split).
 * Async because getCloudflareContext must be async-safe in all render modes.
 */
export async function getDb(): Promise<Db> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

/** For code paths that already hold the Worker env (cron handler, route handlers). */
export function dbFromEnv(env: CloudflareEnv): Db {
  return drizzle(env.DB, { schema });
}

export { schema };
