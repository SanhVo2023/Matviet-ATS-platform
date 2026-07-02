import "server-only";
import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "@/db";
import { candidates, stage_history, jobs, users } from "@/db/schema";
import type { TablesInsert } from "@/types/db";
import type { Stage } from "./types";

type CandidateInsert = TablesInsert<"candidates">;
type StageHistoryInsert = TablesInsert<"stage_history">;

const DEMO_NOTE = "SEED_DEMO";

/** db.batch statements per call — D1 caps batch sizes, keep chunks small. */
const BATCH_CHUNK = 50;

const VN_NAMES = [
  "Nguyễn Văn An",
  "Trần Thị Bình",
  "Lê Hoàng Cường",
  "Phạm Thu Dung",
  "Đỗ Minh Em",
  "Vũ Quang Phong",
  "Hoàng Thị Quỳnh",
  "Bùi Văn Sơn",
  "Đặng Thu Trang",
  "Mai Hữu Tuấn",
  "Lý Thị Vân",
  "Tạ Văn Xuân",
  "Đinh Hà Yến",
  "Trương Quốc Anh",
  "Phan Thị Bích",
  "Cao Văn Đức",
  "Hà Thị Em",
  "Lâm Quang Phú",
  "Ngô Thanh Hương",
  "Tô Văn Khánh",
  "Trịnh Thu Lan",
  "Võ Minh Nhật",
  "Đào Thị Oanh",
  "Phạm Văn Phúc",
  "Quách Mai Quân",
  "Nguyễn Hoàng Sương",
  "Trần Văn Tài",
  "Lê Thị Uyên",
  "Phạm Hữu Việt",
  "Đỗ Thanh Yên",
];

const SOURCES = ["manual_upload", "csv_import", "topcv_api", "referral", "email_inbox"] as const;
const STAGES_TIMELINE: Array<{ stage: Stage; daysAfter: number }> = [
  { stage: "new", daysAfter: 0 },
  { stage: "screening", daysAfter: 1 },
  { stage: "screened", daysAfter: 2 },
  { stage: "interview_scheduled", daysAfter: 4 },
  { stage: "interviewed", daysAfter: 7 },
  { stage: "test_sent", daysAfter: 9 },
  { stage: "test_done", daysAfter: 12 },
  { stage: "recommended", daysAfter: 14 },
  { stage: "salary_deal", daysAfter: 16 },
  { stage: "offer_sent", daysAfter: 18 },
  { stage: "offer_accepted", daysAfter: 20 },
  { stage: "hired", daysAfter: 22 },
];

/** Distribution: 30 candidates spread across 3 jobs over 60 days. */
const DISTRIBUTION: Array<{ count: number; finalStage: Stage }> = [
  { count: 10, finalStage: "hired" },
  { count: 8, finalStage: "offer_accepted" },
  { count: 6, finalStage: "interviewed" },
  { count: 3, finalStage: "screening" },
  { count: 3, finalStage: "rejected" },
];

export interface SeedDemoResult {
  candidates_created: number;
  jobs_used: number;
  skipped: boolean;
}

/**
 * Generate demo candidates with realistic stage history. Idempotent — if any
 * candidate with `notes='SEED_DEMO'` exists already, returns { skipped: true }.
 *
 * IMPORTANT: dev-only. Do not run on production. There's no programmatic guard;
 * only expose this via the admin-only in-app action.
 */
export async function seedDemoData(): Promise<SeedDemoResult> {
  const db = await getDb();

  // Idempotency check
  const existing = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.notes, DEMO_NOTE))
    .limit(1);
  if (existing.length > 0) {
    return { candidates_created: 0, jobs_used: 0, skipped: true };
  }

  // Pick (or assume already-existing) demo jobs — first 3 open jobs
  const jobList = await db
    .select({ id: jobs.id, title: jobs.title, role_family: jobs.role_family })
    .from(jobs)
    .where(inArray(jobs.status, ["open", "draft"]))
    .limit(3);
  if (jobList.length === 0) {
    throw new Error(
      "Không có vị trí (jobs) nào để seed dữ liệu — tạo ít nhất 1 tin tuyển dụng trước.",
    );
  }

  // Pick first user as actor
  const actorRows = await db.select({ id: users.id }).from(users).limit(1);
  const actorId = actorRows[0]?.id ?? null;

  let nameIdx = 0;
  let candidateRows = 0;
  const now = Date.now();

  // Unlike Postgres there is no stage_history trigger in D1 — the timeline is
  // written explicitly here, so no trigger-row cleanup is needed.
  const statements: BatchItem<"sqlite">[] = [];

  for (const dist of DISTRIBUTION) {
    for (let i = 0; i < dist.count; i++) {
      const job = jobList[(nameIdx + i) % jobList.length]!;
      const fullName = VN_NAMES[nameIdx % VN_NAMES.length] ?? `Demo ${nameIdx}`;
      nameIdx += 1;

      const startDaysAgo = 30 + Math.floor(Math.random() * 30); // 30-60 days ago
      const startedAt = new Date(now - startDaysAgo * 24 * 60 * 60 * 1000);

      const candidateId = crypto.randomUUID();
      const phone =
        "0" +
        Math.floor(900000000 + Math.random() * 99999999)
          .toString()
          .slice(0, 9);
      const score = 40 + Math.floor(Math.random() * 50); // 40-89

      const cand: CandidateInsert = {
        id: candidateId,
        job_id: job.id,
        full_name: fullName,
        email: `demo_${candidateId.slice(0, 8)}@example.com`,
        phone,
        source: SOURCES[Math.floor(Math.random() * SOURCES.length)]!,
        notes: DEMO_NOTE,
        current_stage: dist.finalStage,
        ai_score: score,
        ai_screening_status: "success",
        created_by: actorId,
        created_at: startedAt.toISOString(),
        ai_scored_at: new Date(startedAt.getTime() + 60 * 1000).toISOString(),
      };
      statements.push(db.insert(candidates).values(cand));
      candidateRows += 1;

      // Build the stage timeline up to the final stage
      const finalIdx = STAGES_TIMELINE.findIndex((s) => s.stage === dist.finalStage);
      const limit = finalIdx >= 0 ? finalIdx : STAGES_TIMELINE.length - 1;

      const historyRows: StageHistoryInsert[] = [];
      let prev: Stage | null = null;
      for (let s = 0; s <= limit; s++) {
        const step = STAGES_TIMELINE[s]!;
        historyRows.push({
          candidate_id: candidateId,
          from_stage: prev,
          to_stage: step.stage,
          actor_user_id: actorId,
          at: new Date(startedAt.getTime() + step.daysAfter * 24 * 60 * 60 * 1000).toISOString(),
        });
        prev = step.stage;
      }

      // For "rejected" final, insert a rejection row at the end
      if (dist.finalStage === "rejected") {
        historyRows.push({
          candidate_id: candidateId,
          from_stage: prev,
          to_stage: "rejected",
          actor_user_id: actorId,
          at: new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      statements.push(db.insert(stage_history).values(historyRows));
    }
  }

  // Chunked batches (≤50 statements each). Statement order is preserved, so
  // each candidate insert always precedes its stage_history rows (FK-safe).
  for (let i = 0; i < statements.length; i += BATCH_CHUNK) {
    const chunk = statements.slice(i, i + BATCH_CHUNK);
    await db.batch(chunk as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  }

  return {
    candidates_created: candidateRows,
    jobs_used: jobList.length,
    skipped: false,
  };
}

/** Tear down all demo data (stage_history cascades via FK). */
export async function unseedDemoData(): Promise<{ deleted: number }> {
  const db = await getDb();
  const deleted = await db
    .delete(candidates)
    .where(eq(candidates.notes, DEMO_NOTE))
    .returning({ id: candidates.id });
  return { deleted: deleted.length };
}
