// Emits load-test-set.sql (job + cv_files + candidates + scoring_queue)
// from the test-CV manifest. Run: node scripts/load-test-set-sql.mjs <cvDir>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2];
if (!outDir) throw new Error("usage: node scripts/load-test-set-sql.mjs <cvDir>");
const manifest = JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8"));

const JOB = "22222222-2222-4222-8222-222222222222";
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const esc = (s) => String(s).replace(/'/g, "''");

const requirements = JSON.stringify({
  html: "<ul><li>Tối thiểu 1 năm kinh nghiệm bán lẻ/tư vấn khách hàng (ưu tiên kính mắt, TTTM, ngành hàng cao cấp)</li><li>Giao tiếp tốt, ngoại hình gọn gàng</li><li>Ưu tiên biết đo khúc xạ hoặc có kiến thức quang học</li><li>Tiếng Anh giao tiếp là lợi thế (nhiều khách nước ngoài)</li><li>Sống tại TP.HCM, đi ca linh hoạt cuối tuần/lễ</li></ul>",
});
const weights = JSON.stringify({
  industry_fit: 0.2,
  professional_skills: 0.25,
  work_experience: 0.2,
  years_experience: 0.15,
  education: 0.1,
  location: 0.1,
});
const description =
  "<p>Tư vấn và bán kính mắt (gọng, tròng, kính mát) tại cửa hàng Mắt Việt trong Vincom Center Đồng Khởi. Phục vụ tệp khách trung–cao cấp, hỗ trợ đo khúc xạ cơ bản, chăm sóc khách hàng sau bán.</p>";

const sql = [];
sql.push(
  `INSERT OR IGNORE INTO jobs (id, title, code, role_family, flow_type, status, headcount, location, description, requirements, weights, is_archived, posted_at, created_at, updated_at) VALUES ('${JOB}', 'Nhân viên bán hàng — Vincom Đồng Khởi', 'VDK-SALES-01', 'sales', 'staff', 'open', 3, 'Vincom Center Đồng Khởi, Q.1, TP.HCM', '${esc(description)}', '${esc(requirements)}', '${esc(weights)}', 0, ${NOW}, ${NOW}, ${NOW});`,
);

manifest.forEach((cv, i) => {
  const n = String(i + 1).padStart(2, "0");
  const cvId = `33333333-3333-4333-8333-3333333333${n}`;
  const candId = `44444444-4444-4444-8444-4444444444${n}`;
  const qId = `55555555-5555-4555-8555-5555555555${n}`;
  sql.push(
    `INSERT OR IGNORE INTO cv_files (id, storage_path, original_name, mime, size_bytes, created_at) VALUES ('${cvId}', 'test-vdk/${cv.file}', '${esc(cv.file)}', 'application/pdf', 25000, ${NOW});`,
  );
  sql.push(
    `INSERT OR IGNORE INTO candidates (id, job_id, full_name, email, phone, location, source, source_meta, current_stage, cv_file_id, ai_screening_status, is_archived, created_at, updated_at) VALUES ('${candId}', '${JOB}', '${esc(cv.name)}', '${esc(cv.email)}', '${esc(cv.phone)}', '${esc(cv.address)}', 'manual_upload', '{}', 'new', '${cvId}', 'pending', 0, ${NOW}, ${NOW});`,
  );
  sql.push(
    `INSERT OR IGNORE INTO scoring_queue (id, candidate_id, status, attempts, enqueued_at) VALUES ('${qId}', '${candId}', 'queued', 0, ${NOW});`,
  );
});

writeFileSync(join(outDir, "load-test-set.sql"), sql.join("\n"));
console.log(`SQL written: ${sql.length} statements → ${join(outDir, "load-test-set.sql")}`);
