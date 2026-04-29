import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/types/db";

type CandidateInsert = TablesInsert<"candidates">;
type StageHistoryInsert = TablesInsert<"stage_history">;

const DEMO_NOTE = "SEED_DEMO";

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
const STAGES_TIMELINE: Array<{ stage: string; daysAfter: number }> = [
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
const DISTRIBUTION = [
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
 * the npm script that calls this should not be wired into CI.
 */
export async function seedDemoData(): Promise<SeedDemoResult> {
  const admin = createAdminClient();

  // Idempotency check
  const { data: existing } = await admin
    .from("candidates")
    .select("id")
    .eq("notes", DEMO_NOTE)
    .limit(1);
  if ((existing ?? []).length > 0) {
    return { candidates_created: 0, jobs_used: 0, skipped: true };
  }

  // Pick (or assume already-existing) demo jobs — first 3 open jobs
  const { data: jobs } = await admin
    .from("jobs")
    .select("id, title, role_family")
    .in("status", ["open", "draft"])
    .limit(3);
  const jobList = (jobs ?? []) as Array<{ id: string; title: string; role_family: string }>;
  if (jobList.length === 0) {
    throw new Error(
      "Không có vị trí (jobs) nào để seed dữ liệu — tạo ít nhất 1 tin tuyển dụng trước.",
    );
  }

  // Pick first profile as actor
  const { data: actor } = await admin.from("profiles").select("id").limit(1).maybeSingle();
  const actorId = (actor as { id: string } | null)?.id ?? null;

  let nameIdx = 0;
  let candidateRows = 0;
  const now = Date.now();

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

      const cand: CandidateInsert & { id: string } = {
        id: candidateId,
        job_id: job.id,
        full_name: fullName,
        email: `demo_${candidateId.slice(0, 8)}@example.com`,
        phone,
        source: SOURCES[Math.floor(Math.random() * SOURCES.length)]!,
        notes: DEMO_NOTE,
        current_stage: dist.finalStage as never,
        ai_score: score,
        ai_screening_status: "success",
        created_by: actorId,
        created_at: startedAt.toISOString(),
        ai_scored_at: new Date(startedAt.getTime() + 60 * 1000).toISOString(),
      };

      const { error: candErr } = await admin.from("candidates").insert(cand as never);
      if (candErr) throw candErr;
      candidateRows += 1;

      // Build stage_history retroactively. The trigger fires on insert + update,
      // so the candidate already has a "new" row. We need to backfill the rest
      // of the timeline manually with the correct timestamps.
      // Step 1: delete the trigger-inserted row so we have a clean slate
      await admin.from("stage_history").delete().eq("candidate_id", candidateId);

      // Step 2: insert the timeline up to the final stage
      const finalIdx = STAGES_TIMELINE.findIndex((s) => s.stage === dist.finalStage);
      const limit = finalIdx >= 0 ? finalIdx : STAGES_TIMELINE.length - 1;

      const historyRows: StageHistoryInsert[] = [];
      let prev: string | null = null;
      for (let s = 0; s <= limit; s++) {
        const step = STAGES_TIMELINE[s]!;
        historyRows.push({
          candidate_id: candidateId,
          from_stage: prev as never,
          to_stage: step.stage as never,
          actor_user_id: actorId,
          at: new Date(startedAt.getTime() + step.daysAfter * 24 * 60 * 60 * 1000).toISOString(),
        });
        prev = step.stage;
      }

      // For "rejected" final, insert a rejection row at the end
      if (dist.finalStage === "rejected") {
        historyRows.push({
          candidate_id: candidateId,
          from_stage: prev as never,
          to_stage: "rejected" as never,
          actor_user_id: actorId,
          at: new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const { error: histErr } = await admin.from("stage_history").insert(historyRows as never);
      if (histErr) throw histErr;
    }
  }

  return {
    candidates_created: candidateRows,
    jobs_used: jobList.length,
    skipped: false,
  };
}

/** Tear down all demo data. Used by the CLI script. */
export async function unseedDemoData(): Promise<{ deleted: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("candidates")
    .delete()
    .eq("notes", DEMO_NOTE)
    .select("id");
  if (error) throw error;
  return { deleted: ((data ?? []) as unknown[]).length };
}
