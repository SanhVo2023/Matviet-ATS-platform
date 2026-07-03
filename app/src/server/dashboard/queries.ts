import "server-only";
import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { approvals, candidates, interviews, jobs } from "@/db/schema";
import {
  listPendingApprovalsForUser,
  type PendingApprovalRow,
} from "@/server/approvals/repository";
import { listInterviews, type InterviewRow } from "@/server/interviews/repository";

/**
 * Landing-page data (G11). All timestamps are UTC ISO in the DB; "today"
 * means the Vietnam calendar day (UTC+7, no DST).
 */

function vnDayBoundsUtc(): { start: string; end: string } {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const nowVn = new Date(Date.now() + VN_OFFSET_MS);
  const startVn = Date.UTC(
    nowVn.getUTCFullYear(),
    nowVn.getUTCMonth(),
    nowVn.getUTCDate(),
    0,
    0,
    0,
  );
  return {
    start: new Date(startVn - VN_OFFSET_MS).toISOString(),
    end: new Date(startVn - VN_OFFSET_MS + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export interface TodayInterviewItem {
  id: string;
  scheduled_at: string;
  duration_min: number;
  type: InterviewRow["type"];
  candidate_name: string;
  job_title: string | null;
}

export interface RecentCandidateItem {
  id: string;
  full_name: string;
  job_title: string | null;
  created_at: string;
  ai_score: number | null;
  current_stage: (typeof candidates.$inferSelect)["current_stage"];
}

export interface HrDashboardData {
  openJobs: number;
  newCvs7d: number;
  todayInterviewCount: number;
  pendingApprovals: number;
  todayInterviews: TodayInterviewItem[];
  recentCandidates: RecentCandidateItem[];
}

export async function getHrDashboardData(): Promise<HrDashboardData> {
  const db = await getDb();
  const { start, end } = vnDayBoundsUtc();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [openJobsRow, newCvsRow, pendingApprovalsRow, todayRows, recentRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(jobs)
      .where(and(eq(jobs.status, "open"), eq(jobs.is_archived, false)))
      .get(),
    db
      .select({ n: count() })
      .from(candidates)
      .where(and(eq(candidates.is_archived, false), gte(candidates.created_at, sevenDaysAgo)))
      .get(),
    db.select({ n: count() }).from(approvals).where(eq(approvals.status, "pending")).get(),
    db
      .select({
        id: interviews.id,
        scheduled_at: interviews.scheduled_at,
        duration_min: interviews.duration_min,
        type: interviews.type,
        candidate_name: candidates.full_name,
        job_title: jobs.title,
      })
      .from(interviews)
      .innerJoin(candidates, eq(candidates.id, interviews.candidate_id))
      .leftJoin(jobs, eq(jobs.id, interviews.job_id))
      .where(
        and(
          eq(interviews.status, "scheduled"),
          gte(interviews.scheduled_at, start),
          lt(interviews.scheduled_at, end),
        ),
      )
      .orderBy(interviews.scheduled_at),
    db
      .select({
        id: candidates.id,
        full_name: candidates.full_name,
        job_title: jobs.title,
        created_at: candidates.created_at,
        ai_score: candidates.ai_score,
        current_stage: candidates.current_stage,
      })
      .from(candidates)
      .leftJoin(jobs, eq(jobs.id, candidates.job_id))
      .where(eq(candidates.is_archived, false))
      .orderBy(desc(candidates.created_at))
      .limit(6),
  ]);

  return {
    openJobs: Number(openJobsRow?.n ?? 0),
    newCvs7d: Number(newCvsRow?.n ?? 0),
    todayInterviewCount: todayRows.length,
    pendingApprovals: Number(pendingApprovalsRow?.n ?? 0),
    todayInterviews: todayRows,
    recentCandidates: recentRows,
  };
}

export interface ManagerInboxData {
  pendingSteps: PendingApprovalRow[];
  upcomingInterviews: TodayInterviewItem[];
}

export async function getManagerInboxData(
  userId: string,
  role: "hiring_manager",
): Promise<ManagerInboxData> {
  const db = await getDb();
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingSteps, myInterviews] = await Promise.all([
    listPendingApprovalsForUser(userId, role),
    listInterviews({ for_user_id: userId, status: "scheduled", upcoming_only: true }),
  ]);

  const withinWeek = myInterviews.filter((iv) => iv.scheduled_at <= weekAhead).slice(0, 8);
  const items: TodayInterviewItem[] = [];
  for (const iv of withinWeek) {
    const cand = await db
      .select({ full_name: candidates.full_name })
      .from(candidates)
      .where(eq(candidates.id, iv.candidate_id))
      .get();
    const job = await db
      .select({ title: jobs.title })
      .from(jobs)
      .where(eq(jobs.id, iv.job_id))
      .get();
    items.push({
      id: iv.id,
      scheduled_at: iv.scheduled_at,
      duration_min: iv.duration_min,
      type: iv.type,
      candidate_name: cand?.full_name ?? "—",
      job_title: job?.title ?? null,
    });
  }

  return { pendingSteps, upcomingInterviews: items };
}

export async function getExecQueueData(
  userId: string,
  role: "bod" | "tap_doan",
): Promise<PendingApprovalRow[]> {
  return listPendingApprovalsForUser(userId, role);
}
