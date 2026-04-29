// Seed (or tear down) demo candidate data for visualizing /bao-cao charts.
// Usage:
//   npm run seed:demo            # seed
//   npm run seed:demo -- clean   # remove demo rows
//
// IMPORTANT: dev-only. Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
// app/.env.local. Never commit demo data to production.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// Load .env.local without taking on a dotenv dependency
const here = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(here, "..", ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // No .env.local — assume env vars are set by the shell
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_NOTE = "SEED_DEMO";

const VN_NAMES = [
  "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thu Dung", "Đỗ Minh Em",
  "Vũ Quang Phong", "Hoàng Thị Quỳnh", "Bùi Văn Sơn", "Đặng Thu Trang", "Mai Hữu Tuấn",
  "Lý Thị Vân", "Tạ Văn Xuân", "Đinh Hà Yến", "Trương Quốc Anh", "Phan Thị Bích",
  "Cao Văn Đức", "Hà Thị Em", "Lâm Quang Phú", "Ngô Thanh Hương", "Tô Văn Khánh",
  "Trịnh Thu Lan", "Võ Minh Nhật", "Đào Thị Oanh", "Phạm Văn Phúc", "Quách Mai Quân",
  "Nguyễn Hoàng Sương", "Trần Văn Tài", "Lê Thị Uyên", "Phạm Hữu Việt", "Đỗ Thanh Yên",
];
const SOURCES = ["manual_upload", "csv_import", "topcv_api", "referral", "email_inbox"];
const STAGES_TIMELINE = [
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
const DISTRIBUTION = [
  { count: 10, finalStage: "hired" },
  { count: 8, finalStage: "offer_accepted" },
  { count: 6, finalStage: "interviewed" },
  { count: 3, finalStage: "screening" },
  { count: 3, finalStage: "rejected" },
];

const action = process.argv[2];

if (action === "clean") {
  console.log("Removing all demo candidates (notes='SEED_DEMO')…");
  const { data, error } = await admin.from("candidates").delete().eq("notes", DEMO_NOTE).select("id");
  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
  console.log(`Deleted ${(data ?? []).length} demo candidates.`);
  process.exit(0);
}

console.log("Seeding demo data…");

const { data: existing } = await admin.from("candidates").select("id").eq("notes", DEMO_NOTE).limit(1);
if ((existing ?? []).length > 0) {
  console.log("Demo data already exists. Run with `clean` to reset first.");
  process.exit(0);
}

const { data: jobs } = await admin
  .from("jobs")
  .select("id, title")
  .in("status", ["open", "draft"])
  .limit(3);
const jobList = jobs ?? [];
if (jobList.length === 0) {
  console.error("No jobs found — create at least 1 tin tuyển dụng first.");
  process.exit(1);
}

const { data: actor } = await admin.from("profiles").select("id").limit(1).maybeSingle();
const actorId = actor?.id ?? null;

let nameIdx = 0;
let created = 0;
const now = Date.now();

for (const dist of DISTRIBUTION) {
  for (let i = 0; i < dist.count; i++) {
    const job = jobList[(nameIdx + i) % jobList.length];
    const fullName = VN_NAMES[nameIdx % VN_NAMES.length] ?? `Demo ${nameIdx}`;
    nameIdx += 1;

    const startDaysAgo = 30 + Math.floor(Math.random() * 30);
    const startedAt = new Date(now - startDaysAgo * 24 * 60 * 60 * 1000);

    const candidateId = crypto.randomUUID();
    const phone = "0" + Math.floor(900000000 + Math.random() * 99999999).toString().slice(0, 9);
    const score = 40 + Math.floor(Math.random() * 50);

    const cand = {
      id: candidateId,
      job_id: job.id,
      full_name: fullName,
      email: `demo_${candidateId.slice(0, 8)}@example.com`,
      phone,
      source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
      notes: DEMO_NOTE,
      current_stage: dist.finalStage,
      ai_score: score,
      ai_screening_status: "success",
      created_by: actorId,
      created_at: startedAt.toISOString(),
      ai_scored_at: new Date(startedAt.getTime() + 60 * 1000).toISOString(),
    };

    const { error: candErr } = await admin.from("candidates").insert(cand);
    if (candErr) {
      console.error(`Insert failed (${fullName}):`, candErr.message);
      process.exit(1);
    }
    created += 1;

    // Reset trigger-inserted history then backfill the timeline retroactively
    await admin.from("stage_history").delete().eq("candidate_id", candidateId);

    const finalIdx = STAGES_TIMELINE.findIndex((s) => s.stage === dist.finalStage);
    const limit = finalIdx >= 0 ? finalIdx : STAGES_TIMELINE.length - 1;

    const history = [];
    let prev = null;
    for (let s = 0; s <= limit; s++) {
      const step = STAGES_TIMELINE[s];
      history.push({
        candidate_id: candidateId,
        from_stage: prev,
        to_stage: step.stage,
        actor_user_id: actorId,
        at: new Date(startedAt.getTime() + step.daysAfter * 24 * 60 * 60 * 1000).toISOString(),
      });
      prev = step.stage;
    }
    if (dist.finalStage === "rejected") {
      history.push({
        candidate_id: candidateId,
        from_stage: prev,
        to_stage: "rejected",
        actor_user_id: actorId,
        at: new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const { error: histErr } = await admin.from("stage_history").insert(history);
    if (histErr) {
      console.error(`History insert failed (${fullName}):`, histErr.message);
      process.exit(1);
    }
  }
}

console.log(`✓ Created ${created} demo candidates across ${jobList.length} jobs.`);
console.log("Open /bao-cao to see the charts populate.");
console.log('Run `npm run seed:demo -- clean` to remove.');
