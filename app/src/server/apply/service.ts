import "server-only";
import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, jobs } from "@/db/schema";
import { uploadCandidateWithCv, type UploadedFile } from "@/server/candidates/service";
import { enqueueScoring } from "@/server/scoring/repository";
import { triggerEdgeFunction } from "@/server/scoring/orchestration";
import { composeFromTemplate } from "@/server/email/service";
import { notifyRoles } from "@/server/notifications/service";

/**
 * Public careers-page application intake (G12).
 *
 * Anti-abuse (no captcha service, deliberately):
 *   - honeypot + minimum-fill-time checks live in the API route
 *   - per-IP rate limit here (5 applications/hour, counted via source_meta)
 *   - duplicate block: same email or phone already applied to the same job
 * At 20–50 CVs/job this is proportionate; Turnstile can be added later if
 * spam ever materializes.
 */

const MAX_PER_IP_PER_HOUR = 5;

export interface PublicJob {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string | null;
  headcount: number;
}

/** Jobs shown on the public /tuyen-dung list: open + not archived. */
export async function listOpenJobs(): Promise<PublicJob[]> {
  const db = await getDb();
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      location: jobs.location,
      description: jobs.description,
      salary_min: jobs.salary_min,
      salary_max: jobs.salary_max,
      posted_at: jobs.posted_at,
      headcount: jobs.headcount,
    })
    .from(jobs)
    .where(and(eq(jobs.status, "open"), eq(jobs.is_archived, false)))
    .orderBy(desc(jobs.posted_at), desc(jobs.created_at));
}

export async function getPublicJob(jobId: string): Promise<PublicJob | null> {
  const db = await getDb();
  const row = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      location: jobs.location,
      description: jobs.description,
      salary_min: jobs.salary_min,
      salary_max: jobs.salary_max,
      posted_at: jobs.posted_at,
      headcount: jobs.headcount,
    })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.status, "open"), eq(jobs.is_archived, false)))
    .limit(1)
    .then((r) => r[0] ?? null);
  return row;
}

export interface PublicApplicationInput {
  job_id: string;
  full_name: string;
  email: string;
  phone: string;
  ip: string;
  user_agent: string | null;
}

export type ApplyResult = { ok: true; candidate_id: string } | { ok: false; error: string };

export async function submitPublicApplication(
  input: PublicApplicationInput,
  file: UploadedFile,
): Promise<ApplyResult> {
  const db = await getDb();

  const job = await getPublicJob(input.job_id);
  if (!job) return { ok: false, error: "Vị trí này đã đóng hoặc không tồn tại" };

  // Per-IP rate limit — source_meta carries the ip for careers_page rows.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await db
    .select({ n: sql<number>`count(*)` })
    .from(candidates)
    .where(
      and(
        eq(candidates.source, "careers_page"),
        gte(candidates.created_at, hourAgo),
        like(candidates.source_meta, `%"ip":"${input.ip.replace(/[%_"\\]/g, "")}"%`),
      ),
    )
    .then((r) => r[0]?.n ?? 0);
  if (recent >= MAX_PER_IP_PER_HOUR) {
    return { ok: false, error: "Bạn thao tác quá nhanh — vui lòng thử lại sau ít phút" };
  }

  // Duplicate block: same email OR phone already on this job (not archived)
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const dup = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      and(
        eq(candidates.job_id, input.job_id),
        eq(candidates.is_archived, false),
        or(eq(candidates.email, email), phone ? eq(candidates.phone, phone) : sql`0`),
      ),
    )
    .limit(1)
    .then((r) => r[0] ?? null);
  if (dup) {
    return {
      ok: false,
      error:
        "Bạn đã ứng tuyển vị trí này rồi. Phòng Nhân sự sẽ liên hệ qua email/điện thoại bạn đã đăng ký.",
    };
  }

  const nowIso = new Date().toISOString();
  const { id } = await uploadCandidateWithCv(
    {
      full_name: input.full_name.trim(),
      email,
      phone,
      job_id: input.job_id,
      source: "careers_page",
      notes: "",
    },
    file,
    null, // public — no signed-in uploader
    {
      consent_at: nowIso,
      source_meta: { ip: input.ip, ua: (input.user_agent ?? "").slice(0, 200) },
    },
  );

  // AI scoring kicks off exactly like an HR upload (queue fast path + cron backstop)
  try {
    await enqueueScoring(id, null);
    triggerEdgeFunction(id);
  } catch (err) {
    console.warn("[apply] scoring enqueue failed (drain will retry):", err);
  }

  // Receipt acknowledgement — auto template (requires_approval=0)
  try {
    await composeFromTemplate({
      templateCode: "receipt_ack",
      to: [email],
      vars: { candidate_name: input.full_name.trim(), job_title: job.title },
      candidateId: id,
      jobId: job.id,
      createdBy: null,
    });
  } catch (err) {
    console.warn("[apply] receipt_ack enqueue failed:", err);
  }

  await notifyRoles(["hr", "admin"], {
    type: "candidate_new",
    title: `Ứng viên mới từ trang tuyển dụng: ${input.full_name.trim()}`,
    body: `Vị trí: ${job.title} — AI đang chấm điểm`,
    link: `/ung-vien/${id}`,
  });

  return { ok: true, candidate_id: id };
}
