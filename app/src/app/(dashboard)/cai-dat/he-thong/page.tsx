import type { Metadata } from "next";
import { desc, eq, gte, sql } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { ai_usage_log, email_messages, scoring_queue, sessions, users } from "@/db/schema";
import { getSetting, SETTING_KEYS } from "@/server/settings/repository";
import { AI_MODEL_CHOICES, DEFAULT_AI_MODEL } from "@/lib/ai/workers-ai";
import { PageHeader } from "@/components/primitives/PageHeader";
import { SystemAdminClient } from "./SystemAdminClient";

export const metadata: Metadata = { title: "Quản trị hệ thống" };
export const dynamic = "force-dynamic";

export default async function SystemAdminPage() {
  await requireRole(["admin"]);
  const db = await getDb();

  const [modelSetting, enabledSetting] = await Promise.all([
    getSetting(SETTING_KEYS.aiModel),
    getSetting(SETTING_KEYS.aiEnabled),
  ]);
  const currentModel = modelSetting ?? process.env.AI_MODEL ?? DEFAULT_AI_MODEL;
  const aiEnabled = enabledSetting !== "false";

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [
    usageByFeature,
    usage30d,
    recentCalls,
    scoringByStatus,
    emailByStatus,
    userRows,
    sessionRows,
  ] = await Promise.all([
    db
      .select({
        feature: ai_usage_log.feature,
        calls: sql<number>`count(*)`,
        tokens_in: sql<number>`sum(${ai_usage_log.tokens_in})`,
        tokens_out: sql<number>`sum(${ai_usage_log.tokens_out})`,
        cost: sql<number>`sum(${ai_usage_log.cost_usd})`,
      })
      .from(ai_usage_log)
      .where(gte(ai_usage_log.created_at, sevenDaysAgo))
      .groupBy(ai_usage_log.feature),
    db
      .select({
        calls: sql<number>`count(*)`,
        tokens: sql<number>`sum(${ai_usage_log.tokens_in} + ${ai_usage_log.tokens_out})`,
        cost: sql<number>`sum(${ai_usage_log.cost_usd})`,
      })
      .from(ai_usage_log)
      .where(gte(ai_usage_log.created_at, thirtyDaysAgo))
      .then((r) => r[0] ?? { calls: 0, tokens: 0, cost: 0 }),
    db
      .select({
        feature: ai_usage_log.feature,
        model: ai_usage_log.model,
        tokens_in: ai_usage_log.tokens_in,
        tokens_out: ai_usage_log.tokens_out,
        cost_usd: ai_usage_log.cost_usd,
        created_at: ai_usage_log.created_at,
      })
      .from(ai_usage_log)
      .orderBy(desc(ai_usage_log.created_at))
      .limit(10),
    db
      .select({ status: scoring_queue.status, n: sql<number>`count(*)` })
      .from(scoring_queue)
      .groupBy(scoring_queue.status),
    db
      .select({ status: email_messages.status, n: sql<number>`count(*)` })
      .from(email_messages)
      .where(eq(email_messages.direction, "outbound"))
      .groupBy(email_messages.status),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .orderBy(users.name),
    db
      .select({
        userId: sessions.userId,
        n: sql<number>`count(*)`,
        latest: sql<number>`max(${sessions.updatedAt})`,
      })
      .from(sessions)
      .where(sql`${sessions.expiresAt} > unixepoch() * 1000 OR ${sessions.expiresAt} > unixepoch()`)
      .groupBy(sessions.userId),
  ]);

  const sessionsByUser = new Map(sessionRows.map((s) => [s.userId, s]));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <PageHeader
        icon={ShieldCheck}
        title="Quản trị hệ thống"
        subtitle="Cấu hình AI, theo dõi chi phí, hàng đợi và phiên đăng nhập."
      />
      <SystemAdminClient
        ai={{
          currentModel,
          enabled: aiEnabled,
          choices: AI_MODEL_CHOICES,
          usageByFeature: usageByFeature.map((u) => ({
            feature: u.feature,
            calls: Number(u.calls ?? 0),
            tokensIn: Number(u.tokens_in ?? 0),
            tokensOut: Number(u.tokens_out ?? 0),
            cost: Number(u.cost ?? 0),
          })),
          last30d: {
            calls: Number(usage30d.calls ?? 0),
            tokens: Number(usage30d.tokens ?? 0),
            cost: Number(usage30d.cost ?? 0),
          },
          recentCalls: recentCalls.map((c) => ({
            feature: c.feature,
            model: c.model.split("/").pop() ?? c.model,
            tokens: c.tokens_in + c.tokens_out,
            cost: c.cost_usd,
            at: c.created_at,
          })),
        }}
        queues={{
          scoring: scoringByStatus.map((s) => ({ status: s.status, n: Number(s.n) })),
          email: emailByStatus.map((s) => ({ status: s.status, n: Number(s.n) })),
        }}
        users={userRows.map((u) => {
          const s = sessionsByUser.get(u.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            activeSessions: Number(s?.n ?? 0),
            // drizzle integer-timestamp columns store epoch SECONDS; normalize either unit
            lastActive: s?.latest
              ? new Date(
                  Number(s.latest) > 1e12 ? Number(s.latest) : Number(s.latest) * 1000,
                ).toISOString()
              : null,
          };
        })}
      />
    </div>
  );
}
