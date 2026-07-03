import "server-only";
import { and, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications, push_subscriptions, users, type NOTIFICATION_TYPES } from "@/db/schema";

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}

export interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Insert one notification row per target user. Returns inserted count. */
export async function insertNotifications(
  userIds: string[],
  payload: NotificationPayload,
): Promise<number> {
  if (userIds.length === 0) return 0;
  const db = await getDb();
  const rows = userIds.map((uid) => ({
    user_id: uid,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
  }));
  await db.insert(notifications).values(rows);
  return rows.length;
}

/** Latest notifications + unread count for the bell dropdown. */
export async function listForUser(
  userId: string,
  limit = 20,
): Promise<{ unread: number; items: NotificationRow[] }> {
  const db = await getDb();
  const [items, unreadRow] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        link: notifications.link,
        read_at: notifications.read_at,
        created_at: notifications.created_at,
      })
      .from(notifications)
      .where(eq(notifications.user_id, userId))
      .orderBy(desc(notifications.created_at))
      .limit(limit),
    db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.user_id, userId), isNull(notifications.read_at)))
      .then((r) => r[0]),
  ]);
  return { unread: unreadRow?.n ?? 0, items };
}

/** Mark specific ids (or all unread when ids omitted) as read for this user. */
export async function markRead(userId: string, ids?: string[]): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const base = and(eq(notifications.user_id, userId), isNull(notifications.read_at));
  await db
    .update(notifications)
    .set({ read_at: nowIso })
    .where(ids?.length ? and(base, inArray(notifications.id, ids)) : base);
}

/** True if this exact notification already exists (reminder dedup). */
export async function notificationExists(
  userId: string,
  type: NotificationType,
  link: string,
): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.user_id, userId),
        eq(notifications.type, type),
        eq(notifications.link, link),
      ),
    )
    .limit(1)
    .then((r) => r[0] ?? null);
  return row !== null;
}

/** Retention: notifications older than 60 days are pruned by the cron sweep. */
export async function pruneOldNotifications(days = 60): Promise<void> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  await db.delete(notifications).where(lt(notifications.created_at, cutoff));
}

/** Active user ids for a set of roles (notification fan-out targets). */
export async function userIdsByRoles(roles: string[]): Promise<string[]> {
  if (roles.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.role, roles as (typeof users.$inferSelect.role)[]),
        eq(users.isActive, true),
      ),
    );
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Push subscriptions
// ---------------------------------------------------------------------------

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function upsertPushSubscription(
  userId: string,
  sub: PushSubscriptionRow,
  userAgent?: string | null,
): Promise<void> {
  const db = await getDb();
  await db
    .insert(push_subscriptions)
    .values({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: userAgent ?? null,
    })
    .onConflictDoUpdate({
      target: push_subscriptions.endpoint,
      set: {
        user_id: userId,
        p256dh: sub.p256dh,
        auth: sub.auth,
        user_agent: userAgent ?? null,
        created_at: sql`created_at`,
      },
    });
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  await db.delete(push_subscriptions).where(eq(push_subscriptions.endpoint, endpoint));
}

export async function listPushSubscriptionsForUsers(
  userIds: string[],
): Promise<Array<{ endpoint: string; user_id: string }>> {
  if (userIds.length === 0) return [];
  const db = await getDb();
  return db
    .select({ endpoint: push_subscriptions.endpoint, user_id: push_subscriptions.user_id })
    .from(push_subscriptions)
    .where(inArray(push_subscriptions.user_id, userIds));
}
