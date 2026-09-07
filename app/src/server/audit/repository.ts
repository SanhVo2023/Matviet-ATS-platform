import "server-only";
import { and, desc, eq, like } from "drizzle-orm";
import { getDb } from "@/db";
import { audit_log } from "@/db/schema";
import type { Tables } from "@/types/db";

export type AuditRow = Tables<"audit_log">;

export interface AuditFilter {
  entity?: string;
  /** Prefix match on the action string (e.g. "agent" for agent_*). */
  actionPrefix?: string;
  limit?: number;
}

/** Newest-first audit entries (renovation R3 — the /nhat-ky page). */
export async function listAuditLog(filter: AuditFilter = {}): Promise<AuditRow[]> {
  const db = await getDb();
  const conds = [];
  if (filter.entity) conds.push(eq(audit_log.entity, filter.entity));
  if (filter.actionPrefix) conds.push(like(audit_log.action, `${filter.actionPrefix}%`));
  return db
    .select()
    .from(audit_log)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(audit_log.at))
    .limit(filter.limit ?? 100);
}
