import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { interviews, interview_attendees, candidates, job_assignments } from "@/db/schema";
import { formatDateTime } from "@/lib/vi-format";
import {
  insertNotifications,
  notificationExists,
  pruneOldNotifications,
  userIdsByRoles,
  type NotificationPayload,
} from "./repository";
import { sendPushToUsers } from "./push";

/**
 * Notification fan-out. `notifyUsers` / `notifyRoles` are the ONLY entry
 * points business code calls — both swallow every error, because a failed
 * notification must never fail the scoring job / approval / interview that
 * triggered it.
 */

export interface NotifyOptions {
  /** The acting user — excluded so people aren't notified about their own clicks. */
  excludeUserId?: string;
}

export async function notifyUsers(
  userIds: string[],
  payload: NotificationPayload,
  opts?: NotifyOptions,
): Promise<void> {
  try {
    const targets = [...new Set(userIds)].filter((id) => id && id !== opts?.excludeUserId);
    if (targets.length === 0) return;
    await insertNotifications(targets, payload);
    await sendPushToUsers(targets);
  } catch (err) {
    console.warn("[notifications] notifyUsers failed:", err);
  }
}

export async function notifyRoles(
  roles: string[],
  payload: NotificationPayload,
  opts?: NotifyOptions,
): Promise<void> {
  try {
    const ids = await userIdsByRoles(roles);
    await notifyUsers(ids, payload, opts);
  } catch (err) {
    console.warn("[notifications] notifyRoles failed:", err);
  }
}

/**
 * Managers assigned to a job (for manager_recommend approval steps and
 * interview fan-out). Falls back to HR + admin when nobody is assigned so a
 * pending step never sits unseen.
 */
export async function jobManagerIds(jobId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: job_assignments.manager_user_id })
    .from(job_assignments)
    .where(eq(job_assignments.job_id, jobId));
  const ids = rows.map((r) => r.id).filter((v): v is string => !!v);
  if (ids.length > 0) return ids;
  return userIdsByRoles(["hr", "admin"]);
}

/**
 * Cron sweep (every minute, `/api/notifications/cron`):
 *  1. Remind attendees of interviews starting within the next 60 minutes
 *     (deduped per user via the idx_notifications_dedup lookup).
 *  2. Nudge HR about CVs sitting in 'new' for over 3 days (one per day).
 *  3. Prune notifications older than 60 days.
 */
export async function runNotificationSweep(): Promise<{ reminders: number }> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const horizonIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const upcoming = await db
    .select({
      id: interviews.id,
      candidate_id: interviews.candidate_id,
      scheduled_at: interviews.scheduled_at,
      created_by: interviews.created_by,
    })
    .from(interviews)
    .where(
      and(
        eq(interviews.status, "scheduled"),
        gte(interviews.scheduled_at, nowIso),
        lte(interviews.scheduled_at, horizonIso),
      ),
    );

  let reminders = 0;
  for (const iv of upcoming) {
    const link = `/phong-van?focus=${iv.id}`;
    const [attendees, cand] = await Promise.all([
      db
        .select({ user_id: interview_attendees.user_id })
        .from(interview_attendees)
        .where(eq(interview_attendees.interview_id, iv.id)),
      db
        .select({ full_name: candidates.full_name })
        .from(candidates)
        .where(eq(candidates.id, iv.candidate_id))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);
    const targetIds = [
      ...new Set(
        [...attendees.map((a) => a.user_id), iv.created_by].filter((v): v is string => !!v),
      ),
    ];
    for (const uid of targetIds) {
      if (await notificationExists(uid, "interview_reminder", link)) continue;
      await notifyUsers([uid], {
        type: "interview_reminder",
        title: `Sắp phỏng vấn: ${cand?.full_name ?? "ứng viên"}`,
        body: `Bắt đầu lúc ${formatDateTime(iv.scheduled_at)} (trong vòng 1 giờ tới)`,
        link,
      });
      reminders++;
    }
  }

  // 2. Stale-CV nudge: one summary notification per user per calendar day
  const staleCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const staleRows = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      and(
        eq(candidates.current_stage, "new"),
        eq(candidates.is_archived, false),
        lte(candidates.created_at, staleCutoff),
      ),
    );
  if (staleRows.length > 0) {
    const today = nowIso.slice(0, 10);
    const staleLink = `/ung-vien?nhac=${today}`;
    for (const uid of await userIdsByRoles(["hr", "admin"])) {
      if (await notificationExists(uid, "candidate_stale", staleLink)) continue;
      await notifyUsers([uid], {
        type: "candidate_stale",
        title: `${staleRows.length} CV chờ xử lý quá 3 ngày`,
        body: "Ứng viên chờ lâu dễ nhận việc nơi khác — mở danh sách để sàng lọc",
        link: staleLink,
      });
    }
  }

  await pruneOldNotifications(60);
  return { reminders };
}

/** Convenience re-export so emitters import one module. */
export type { NotificationPayload } from "./repository";
