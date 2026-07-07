import "server-only";
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  candidates,
  jobs,
  interviews,
  approvals,
  stage_history,
  email_messages,
  weight_templates,
  ai_screenings,
  audit_log,
  JOB_STATUSES,
  ROLE_FAMILIES,
} from "@/db/schema";
import { aiWithTools, aiChat, type AiToolDef, type ChatMessage } from "@/lib/ai/workers-ai";
import "@/server/ai/runtime";
import { changeStage } from "@/server/candidates/service";
import { scheduleInterview, cancelInterview } from "@/server/interviews/service";
import { startApproval } from "@/server/approvals/engine";
import { enqueueOutbound } from "@/server/email/repository";
import { getHrDashboardData } from "@/server/dashboard/queries";
import { setJobStatus } from "@/server/jobs/service";
import { parseReportFilter } from "@/server/reports/filter";
import { buildReportPayload } from "@/server/reports/queries";
import { ALL_STAGES, allowedNextStages, type Stage } from "@/lib/validation/candidate";
import type { SessionProfile, UserRole } from "@/lib/auth";

/**
 * Trợ lý Mắt Việt HR — the staff agent (ADR 0013 §agent).
 *
 * Safety model (STRICT — the agent has exactly the caller's authority, never more):
 *  - Available to admin/hr only (enforced at the API route AND here).
 *  - TOOL_POLICY maps every tool to the roles allowed to use it. Enforced
 *    TWICE: the tool list handed to the model is pre-filtered by role, and
 *    the executor re-checks before running (defense in depth — the model
 *    can't call what the user couldn't click).
 *  - Every tool runs server-side against the caller's own session profile;
 *    tools reuse the same service functions the UI buttons call.
 *  - Stage moves obey the same transition rules as the UI dropdown
 *    (allowedNextStages) — no agent-only shortcuts to hired/rejected.
 *  - Mutations require in-chat confirmation (confirmed=true, server-refused
 *    otherwise) for jobs, interview cancellation, and terminal stage moves.
 *  - Every mutation writes audit_log with the caller as actor + {via:'agent'}.
 *  - Outward-facing actions are NEVER direct: emails land as pending_approval
 *    drafts; email/approval sign-off stays UI-only.
 */

/** Who may use which tool. Single source of truth for agent authority. */
const HR_ADMIN: UserRole[] = ["admin", "hr"];
export const TOOL_POLICY: Record<string, { roles: UserRole[]; mutates: boolean }> = {
  search_candidates: { roles: HR_ADMIN, mutates: false },
  get_candidate: { roles: HR_ADMIN, mutates: false },
  pipeline_summary: { roles: HR_ADMIN, mutates: false },
  list_today_interviews: { roles: HR_ADMIN, mutates: false },
  move_candidate_stage: { roles: HR_ADMIN, mutates: true },
  draft_email: { roles: HR_ADMIN, mutates: true },
  schedule_interview: { roles: HR_ADMIN, mutates: true },
  start_approval: { roles: HR_ADMIN, mutates: true },
  list_jobs: { roles: HR_ADMIN, mutates: false },
  get_job: { roles: HR_ADMIN, mutates: false },
  create_job: { roles: HR_ADMIN, mutates: true },
  update_job: { roles: HR_ADMIN, mutates: true },
  set_job_status: { roles: HR_ADMIN, mutates: true },
  search_cv_content: { roles: HR_ADMIN, mutates: false },
  compare_candidates: { roles: HR_ADMIN, mutates: false },
  candidate_timeline: { roles: HR_ADMIN, mutates: false },
  report_snapshot: { roles: HR_ADMIN, mutates: false },
  email_queue_status: { roles: HR_ADMIN, mutates: false },
  suggest_past_candidates: { roles: HR_ADMIN, mutates: false },
  add_candidate_note: { roles: HR_ADMIN, mutates: true },
  cancel_interview: { roles: HR_ADMIN, mutates: true },
};

export const TOOLS: AiToolDef[] = [
  {
    name: "search_candidates",
    description:
      "Tìm ứng viên theo tên, giai đoạn pipeline và/hoặc vị trí. Trả về: id, tên, giai đoạn, vị trí, điểm AI (sắp theo điểm giảm dần).",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Một phần tên ứng viên (có dấu hoặc không)" },
        stage: {
          type: "string",
          description: "Giai đoạn pipeline, ví dụ: new, screened, interview_scheduled, recommended",
        },
        job: { type: "string", description: "Tên (một phần) hoặc UUID vị trí để lọc" },
      },
    },
  },
  {
    name: "get_candidate",
    description: "Xem chi tiết một ứng viên: hồ sơ, điểm AI, giai đoạn, bước duyệt đang chờ.",
    parameters: {
      type: "object",
      properties: {
        name_or_id: { type: "string", description: "Tên đầy đủ hoặc UUID của ứng viên" },
      },
      required: ["name_or_id"],
    },
  },
  {
    name: "pipeline_summary",
    description:
      "Tổng quan tuyển dụng hôm nay: số tin đang mở, CV mới 7 ngày, phỏng vấn hôm nay, hồ sơ chờ duyệt.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_today_interviews",
    description: "Danh sách các buổi phỏng vấn hôm nay (giờ Việt Nam).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "move_candidate_stage",
    description:
      "Chuyển ứng viên sang giai đoạn pipeline khác (theo đúng luật chuyển của hệ thống). Giai đoạn: new, screening, screened, interview_scheduled, interviewed, test_sent, test_done, recommended, salary_deal, bod_review, tap_doan_review, offer_sent, offer_accepted, hired, rejected, withdrew. Với hired/rejected/withdrew (không đảo ngược được): BẮT BUỘC hỏi xác nhận trước, chỉ gọi với confirmed=true.",
    parameters: {
      type: "object",
      properties: {
        name_or_id: { type: "string" },
        stage: { type: "string", description: "Giai đoạn đích (giá trị enum tiếng Anh ở trên)" },
        confirmed: {
          type: "boolean",
          description: "Bắt buộc true khi chuyển sang hired/rejected/withdrew",
        },
      },
      required: ["name_or_id", "stage"],
    },
  },
  {
    name: "draft_email",
    description:
      "Soạn email tiếng Việt cho ứng viên (mời phỏng vấn, từ chối, mời nhận việc, nhắc nộp bài…). Email CHỈ được lưu ở trạng thái chờ duyệt — không tự gửi. Người dùng duyệt trong trang Email.",
    parameters: {
      type: "object",
      properties: {
        name_or_id: { type: "string" },
        purpose: {
          type: "string",
          description:
            "Mục đích email, ví dụ: 'từ chối lịch sự', 'mời phỏng vấn vòng 2 thứ Năm 14h'",
        },
      },
      required: ["name_or_id", "purpose"],
    },
  },
  {
    name: "schedule_interview",
    description:
      "Đặt lịch phỏng vấn cho ứng viên (tạo sự kiện Outlook + link Teams nếu là video). scheduled_at PHẢI là ISO 8601 có múi giờ, ví dụ 2026-07-04T14:00:00+07:00.",
    parameters: {
      type: "object",
      properties: {
        name_or_id: { type: "string" },
        scheduled_at: { type: "string", description: "ISO 8601 với +07:00" },
        duration_min: { type: "number", description: "Mặc định 45" },
        type: { type: "string", enum: ["in_person", "phone", "video"] },
        location: { type: "string", description: "Địa điểm nếu phỏng vấn trực tiếp" },
      },
      required: ["name_or_id", "scheduled_at", "type"],
    },
  },
  {
    name: "start_approval",
    description:
      "Bắt đầu quy trình duyệt tuyển cho ứng viên (tạo các bước duyệt theo flow của vị trí).",
    parameters: {
      type: "object",
      properties: { name_or_id: { type: "string" } },
      required: ["name_or_id"],
    },
  },
  // ------------------------- Vị trí (jobs) -------------------------
  {
    name: "list_jobs",
    description: "Liệt kê vị trí: id, tiêu đề, trạng thái, địa điểm, số ứng viên.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Lọc: draft, open, paused, closed, filled" },
        query: { type: "string", description: "Một phần tiêu đề" },
      },
    },
  },
  {
    name: "get_job",
    description:
      "Bức tranh toàn cảnh một vị trí: chi tiết vị trí + funnel từng giai đoạn, đã tuyển/chỉ tiêu, điểm AI trung bình & cao nhất, ai đang chờ duyệt, lịch phỏng vấn sắp tới, giai đoạn đang kẹt lâu nhất.",
    parameters: {
      type: "object",
      properties: { job: { type: "string", description: "Tiêu đề (một phần) hoặc UUID" } },
      required: ["job"],
    },
  },
  {
    name: "create_job",
    description:
      "Tạo vị trí MỚI ở trạng thái NHÁP. BẮT BUỘC hỏi người dùng xác nhận trước (tóm tắt tiêu đề/địa điểm/lương/mô tả), chỉ gọi với confirmed=true sau khi họ đồng ý. Muốn đăng công khai thì gọi tiếp set_job_status.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        role_family: {
          type: "string",
          enum: ["sales", "optician", "office", "manager", "custom"],
          description: "sales=bán hàng, optician=khúc xạ, office=văn phòng, manager=quản lý",
        },
        location: { type: "string" },
        description: { type: "string", description: "Mô tả công việc (HTML <p>/<ul> đơn giản)" },
        headcount: { type: "number" },
        salary_min: { type: "number", description: "VND/tháng" },
        salary_max: { type: "number", description: "VND/tháng" },
        confirmed: { type: "boolean", description: "true CHỈ KHI người dùng đã xác nhận" },
      },
      required: ["title", "role_family", "confirmed"],
    },
  },
  {
    name: "update_job",
    description:
      "Sửa vị trí (tiêu đề, mô tả, địa điểm, chỉ tiêu, lương). BẮT BUỘC hỏi xác nhận trước; chỉ gọi với confirmed=true sau khi người dùng đồng ý.",
    parameters: {
      type: "object",
      properties: {
        job: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        location: { type: "string" },
        headcount: { type: "number" },
        salary_min: { type: "number" },
        salary_max: { type: "number" },
        confirmed: { type: "boolean" },
      },
      required: ["job", "confirmed"],
    },
  },
  {
    name: "set_job_status",
    description:
      "Đổi trạng thái tin: open (đăng công khai lên trang tuyển dụng), paused, closed, filled. BẮT BUỘC hỏi xác nhận trước; chỉ gọi với confirmed=true.",
    parameters: {
      type: "object",
      properties: {
        job: { type: "string" },
        status: { type: "string", enum: ["draft", "open", "paused", "closed", "filled"] },
        confirmed: { type: "boolean" },
      },
      required: ["job", "status", "confirmed"],
    },
  },
  // ----------------------------- Insight tools -----------------------------
  {
    name: "search_cv_content",
    description:
      "Tìm TRONG NỘI DUNG CV của tất cả ứng viên (kỹ năng, công ty cũ, ngoại ngữ…). Trả về ứng viên khớp + đoạn trích ngữ cảnh.",
    parameters: {
      type: "object",
      properties: { keyword: { type: "string", description: "Từ khóa, ví dụ 'tiếng Trung'" } },
      required: ["keyword"],
    },
  },
  {
    name: "compare_candidates",
    description:
      "So sánh 2-5 ứng viên cạnh nhau: điểm AI theo từng tiêu chí, giai đoạn, vị trí. Trình bày kết quả dạng bảng Markdown.",
    parameters: {
      type: "object",
      properties: {
        names_or_ids: { type: "array", items: { type: "string" }, description: "2-5 tên/UUID" },
      },
      required: ["names_or_ids"],
    },
  },
  {
    name: "candidate_timeline",
    description:
      "Toàn bộ lịch sử một ứng viên theo thời gian: các lần chuyển giai đoạn, phỏng vấn, email đã gửi/chờ duyệt.",
    parameters: {
      type: "object",
      properties: { name_or_id: { type: "string" } },
      required: ["name_or_id"],
    },
  },
  {
    name: "report_snapshot",
    description:
      "Báo cáo nhanh trong chat: funnel tổng, time-to-hire, hiệu quả nguồn CV, tuyển theo tháng. Mặc định 90 ngày gần nhất.",
    parameters: {
      type: "object",
      properties: { days: { type: "number", description: "Khoảng ngày nhìn lại (7-365)" } },
    },
  },
  {
    name: "email_queue_status",
    description:
      "Trạng thái hàng đợi email: đang chờ duyệt, đang chờ gửi, gửi lỗi. KHÔNG duyệt được từ chat — hướng người dùng vào trang Email.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "suggest_past_candidates",
    description:
      "Gợi ý ứng viên CŨ tiềm năng cho một tin: người từng ứng tuyển vị trí cùng nhóm, điểm AI cao nhưng chưa được tuyển.",
    parameters: {
      type: "object",
      properties: { job: { type: "string" } },
      required: ["job"],
    },
  },
  // ----------------------------- Small actions -----------------------------
  {
    name: "add_candidate_note",
    description: "Thêm ghi chú vào hồ sơ ứng viên (có dấu thời gian, ghi rõ do Trợ lý AI thêm).",
    parameters: {
      type: "object",
      properties: {
        name_or_id: { type: "string" },
        note: { type: "string" },
      },
      required: ["name_or_id", "note"],
    },
  },
  {
    name: "cancel_interview",
    description:
      "Hủy buổi phỏng vấn sắp tới của ứng viên (hủy cả sự kiện Outlook). BẮT BUỘC hỏi xác nhận trước; chỉ gọi với confirmed=true.",
    parameters: {
      type: "object",
      properties: {
        name_or_id: { type: "string" },
        reason: { type: "string" },
        confirmed: { type: "boolean" },
      },
      required: ["name_or_id", "confirmed"],
    },
  },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Diacritic-insensitive fold ("Nguyễn Thị Mai" → "nguyen thi mai") — LLMs
 * routinely mangle Vietnamese marks inside JSON tool arguments. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
}

async function resolveCandidate(nameOrId: string) {
  const db = await getDb();
  if (UUID_RE.test(nameOrId.trim())) {
    const row = await db
      .select()
      .from(candidates)
      .where(and(eq(candidates.id, nameOrId.trim()), eq(candidates.is_archived, false)))
      .get();
    if (!row) throw new Error(`Không tìm thấy ứng viên với id ${nameOrId}`);
    return row;
  }
  const needle = fold(nameOrId);
  const all = await db
    .select()
    .from(candidates)
    .where(eq(candidates.is_archived, false))
    .limit(300);
  const matches = all.filter((c) => fold(c.full_name).includes(needle)).slice(0, 5);
  if (matches.length === 0) throw new Error(`Không tìm thấy ứng viên tên "${nameOrId}"`);
  if (matches.length > 1) {
    throw new Error(
      `Có ${matches.length} ứng viên khớp "${nameOrId}": ` +
        matches.map((m) => `${m.full_name} (${m.id.slice(0, 8)})`).join(", ") +
        ". Hỏi lại người dùng chọn ai, rồi gọi lại bằng UUID.",
    );
  }
  return matches[0]!;
}

async function jobTitleOf(jobId: string): Promise<string | null> {
  const db = await getDb();
  const j = await db.select({ title: jobs.title }).from(jobs).where(eq(jobs.id, jobId)).get();
  return j?.title ?? null;
}

async function resolveJob(titleOrId: string) {
  const db = await getDb();
  if (UUID_RE.test(titleOrId.trim())) {
    const row = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, titleOrId.trim()), eq(jobs.is_archived, false)))
      .get();
    if (!row) throw new Error(`Không tìm thấy vị trí với id ${titleOrId}`);
    return row;
  }
  const needle = fold(titleOrId);
  const all = await db.select().from(jobs).where(eq(jobs.is_archived, false)).limit(100);
  const matches = all.filter((j) => fold(j.title).includes(needle)).slice(0, 5);
  if (matches.length === 0) throw new Error(`Không tìm thấy vị trí "${titleOrId}"`);
  if (matches.length > 1) {
    throw new Error(
      `Có ${matches.length} tin khớp "${titleOrId}": ` +
        matches.map((m) => `${m.title} (${m.status}, ${m.id.slice(0, 8)})`).join(", ") +
        ". Hỏi lại người dùng chọn tin nào, rồi gọi lại bằng UUID.",
    );
  }
  return matches[0]!;
}

/** The ask-first gate: mutations run only after the model confirms the user said yes. */
const NOT_CONFIRMED = {
  error:
    "CHƯA được xác nhận. Tóm tắt thay đổi định làm cho người dùng, hỏi họ đồng ý không, và CHỈ khi họ trả lời đồng ý mới gọi lại công cụ này với confirmed=true.",
};

/** Every agent write on jobs/interviews leaves an audit trail. */
async function auditAgent(
  profile: SessionProfile,
  entity: string,
  entityId: string,
  action: string,
  after: Record<string, unknown>,
): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(audit_log).values({
      entity,
      entity_id: entityId,
      action,
      actor_user_id: profile.id,
      after: after as never,
      meta: { via: "agent" } as never,
    });
  } catch (err) {
    console.warn("[agent] audit write failed:", err);
  }
}

/** ±90 chars of context around the first match, for search_cv_content. */
function snippetAround(text: string, foldedNeedle: string): string {
  const idx = fold(text).indexOf(foldedNeedle);
  if (idx < 0) return text.slice(0, 180);
  const start = Math.max(0, idx - 90);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, idx + foldedNeedle.length + 90).replace(/\s+/g, " ") +
    "…"
  );
}

const dayMs = 24 * 60 * 60 * 1000;
const daysSince = (iso: string | null) =>
  iso ? Math.round((Date.now() - new Date(iso).getTime()) / dayMs) : null;

function makeExecutor(profile: SessionProfile) {
  return async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    // STRICT authority gate: the tool must exist in the policy AND the
    // caller's role must be allowed — even if the model hallucinated a call.
    const policy = TOOL_POLICY[name];
    if (!policy) return { error: `Công cụ không tồn tại: ${name}` };
    if (!policy.roles.includes(profile.role)) {
      return {
        error: `Vai trò "${profile.role}" không có quyền dùng công cụ ${name}. Báo người dùng thao tác này ngoài thẩm quyền của họ.`,
      };
    }
    const db = await getDb();
    switch (name) {
      case "search_candidates": {
        const conds = [eq(candidates.is_archived, false)];
        const stage = typeof args.stage === "string" ? args.stage.trim() : "";
        if (stage) conds.push(eq(candidates.current_stage, stage as never));
        if (typeof args.job === "string" && args.job.trim()) {
          const j = await resolveJob(args.job);
          conds.push(eq(candidates.job_id, j.id));
        }
        const rows = await db
          .select({
            id: candidates.id,
            full_name: candidates.full_name,
            current_stage: candidates.current_stage,
            ai_score: candidates.ai_score,
            job_id: candidates.job_id,
          })
          .from(candidates)
          .where(and(...conds))
          .limit(300);
        const q = typeof args.query === "string" ? fold(args.query) : "";
        const filtered = (q ? rows.filter((r) => fold(r.full_name).includes(q)) : rows)
          .sort((a, b) => (b.ai_score ?? -1) - (a.ai_score ?? -1))
          .slice(0, 15);
        return await Promise.all(
          filtered.map(async (r) => ({ ...r, job: await jobTitleOf(r.job_id) })),
        );
      }
      case "get_candidate": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const pending = await db
          .select({ step_kind: approvals.step_kind })
          .from(approvals)
          .where(and(eq(approvals.candidate_id, c.id), eq(approvals.status, "pending")));
        const upcoming = await db
          .select({ scheduled_at: interviews.scheduled_at, type: interviews.type })
          .from(interviews)
          .where(and(eq(interviews.candidate_id, c.id), eq(interviews.status, "scheduled")))
          .limit(3);
        return {
          id: c.id,
          full_name: c.full_name,
          email: c.email,
          phone: c.phone,
          stage: c.current_stage,
          ai_score: c.ai_score,
          ai_status: c.ai_screening_status,
          job: await jobTitleOf(c.job_id),
          pending_approval_steps: pending.map((p) => p.step_kind),
          upcoming_interviews: upcoming,
          detail_url: `/ung-vien/${c.id}`,
        };
      }
      case "pipeline_summary": {
        const d = await getHrDashboardData();
        return {
          open_jobs: d.openJobs,
          new_cvs_7d: d.newCvs7d,
          today_interviews: d.todayInterviewCount,
          pending_approvals: d.pendingApprovals,
        };
      }
      case "list_today_interviews": {
        const d = await getHrDashboardData();
        return d.todayInterviews;
      }
      case "move_candidate_stage": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const stage = String(args.stage ?? "") as Stage;
        // Same rules as the UI dropdown — the agent gets no shortcut moves.
        if (!(ALL_STAGES as readonly string[]).includes(stage)) {
          return { error: `Giai đoạn không hợp lệ: "${stage}".` };
        }
        const allowed = allowedNextStages(c.current_stage as Stage);
        if (!allowed.includes(stage)) {
          return {
            error: `Không được chuyển từ "${c.current_stage}" sang "${stage}". Các giai đoạn hợp lệ: ${allowed.join(", ") || "(không còn — hồ sơ đã đóng)"}.`,
          };
        }
        // Terminal moves are irreversible for HR — require in-chat confirmation.
        if (["hired", "rejected", "withdrew"].includes(stage) && args.confirmed !== true) {
          return NOT_CONFIRMED;
        }
        await changeStage(c.id, stage);
        await auditAgent(profile, "candidates", c.id, "agent_stage_move", {
          from: c.current_stage,
          to: stage,
        });
        return { ok: true, message: `Đã chuyển ${c.full_name} sang giai đoạn ${stage}.` };
      }
      case "draft_email": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const purpose = String(args.purpose ?? "");
        const jobTitle = await jobTitleOf(c.job_id);
        const draft = await aiChat(
          [
            {
              role: "system",
              content:
                "Bạn soạn email tuyển dụng tiếng Việt cho Mắt Việt (chuỗi cửa hàng mắt kính). Giọng chuyên nghiệp, ấm áp, xưng 'Mắt Việt', gọi ứng viên là 'bạn'. Trả về CHÍNH XÁC định dạng:\nSUBJECT: <tiêu đề>\nBODY:\n<nội dung HTML đơn giản dùng thẻ <p>>",
            },
            {
              role: "user",
              content: `Ứng viên: ${c.full_name}. Vị trí: ${jobTitle ?? "—"}. Mục đích: ${purpose}. Ký tên: ${profile.full_name ?? "Phòng Nhân sự"} — Phòng Nhân sự Mắt Việt.`,
            },
          ],
          // Reasoning models think before writing — 700 starved the draft body.
          { maxTokens: 3072, temperature: 0.5, feature: "agent", userId: profile.id },
        );
        const m = draft.text.match(/SUBJECT:\s*(.+)\s*BODY:\s*([\s\S]+)/);
        const subject = m?.[1]?.trim() ?? `Mắt Việt — ${purpose}`;
        const bodyHtml = m?.[2]?.trim() ?? `<p>${draft.text}</p>`;
        if (!c.email) return { error: "Ứng viên chưa có địa chỉ email trong hồ sơ." };
        const { id } = await enqueueOutbound({
          candidateId: c.id,
          jobId: c.job_id,
          to: [c.email],
          subject,
          bodyHtml,
          requiresApproval: true, // agent emails ALWAYS wait for human approval
          createdBy: profile.id,
        });
        await auditAgent(profile, "email_messages", id, "agent_draft", {
          candidate: c.full_name,
          subject,
        });
        return {
          ok: true,
          message: `Đã tạo bản nháp email "${subject}" cho ${c.full_name} — đang CHỜ DUYỆT tại trang Email.`,
          email_id: id,
          review_url: "/email",
        };
      }
      case "schedule_interview": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const scheduledAt = new Date(String(args.scheduled_at ?? ""));
        if (Number.isNaN(scheduledAt.getTime())) {
          return { error: "scheduled_at không phải ISO 8601 hợp lệ." };
        }
        const type = ["in_person", "phone", "video"].includes(String(args.type))
          ? (String(args.type) as "in_person" | "phone" | "video")
          : "in_person";
        const r = await scheduleInterview(
          {
            candidate_id: c.id,
            scheduled_at: scheduledAt.toISOString(),
            duration_min: typeof args.duration_min === "number" ? args.duration_min : 45,
            type,
            location_or_link: typeof args.location === "string" ? args.location : "",
            attendee_ids: [profile.id],
            notes: "Đặt lịch bởi Trợ lý AI",
          },
          profile.id,
        );
        // The Outlook event is best-effort inside scheduleInterview — only
        // claim the invite went out if it actually did.
        const row = await (await getDb())
          .select({ graph_event_id: interviews.graph_event_id })
          .from(interviews)
          .where(eq(interviews.id, r.id))
          .get();
        const inviteNote = row?.graph_event_id
          ? "lời mời Outlook đã gửi cho ứng viên và bạn"
          : "KHÔNG gửi được lời mời Outlook — báo ứng viên qua kênh khác hoặc đặt lại lịch";
        await auditAgent(profile, "interviews", r.id, "agent_schedule", {
          candidate: c.full_name,
          scheduled_at: scheduledAt.toISOString(),
          type,
        });
        return {
          ok: true,
          message: `Đã đặt lịch phỏng vấn ${type === "video" ? "online (Teams)" : type === "phone" ? "điện thoại" : "trực tiếp"} cho ${c.full_name} lúc ${scheduledAt.toISOString()} (${inviteNote}).`,
          interview_url: `/phong-van/${r.id}`,
        };
      }
      case "start_approval": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const r = await startApproval(c.id);
        await auditAgent(profile, "approvals", c.id, "agent_start_approval", {
          candidate: c.full_name,
          steps: r.approval_ids.length,
        });
        return {
          ok: true,
          message: `Đã tạo quy trình duyệt cho ${c.full_name} (${r.approval_ids.length} bước).`,
        };
      }
      // ---------------------- Vị trí (jobs) ----------------------
      case "list_jobs": {
        const conds = [eq(jobs.is_archived, false)];
        const status = typeof args.status === "string" ? args.status.trim() : "";
        if (status && (JOB_STATUSES as readonly string[]).includes(status)) {
          conds.push(eq(jobs.status, status as never));
        }
        const rows = await db
          .select({
            id: jobs.id,
            title: jobs.title,
            status: jobs.status,
            location: jobs.location,
            headcount: jobs.headcount,
            posted_at: jobs.posted_at,
          })
          .from(jobs)
          .where(and(...conds))
          .orderBy(desc(jobs.created_at))
          .limit(50);
        const q = typeof args.query === "string" ? fold(args.query) : "";
        const filtered = (q ? rows.filter((r) => fold(r.title).includes(q)) : rows).slice(0, 20);
        return await Promise.all(
          filtered.map(async (r) => {
            const cands = await db
              .select({ id: candidates.id })
              .from(candidates)
              .where(and(eq(candidates.job_id, r.id), eq(candidates.is_archived, false)));
            return { ...r, candidate_count: cands.length, days_open: daysSince(r.posted_at) };
          }),
        );
      }
      case "get_job": {
        const j = await resolveJob(String(args.job ?? ""));
        const cands = await db
          .select({
            id: candidates.id,
            full_name: candidates.full_name,
            current_stage: candidates.current_stage,
            ai_score: candidates.ai_score,
          })
          .from(candidates)
          .where(and(eq(candidates.job_id, j.id), eq(candidates.is_archived, false)));

        // Funnel + dwell time per stage (from each candidate's last stage move)
        const funnel: Record<string, number> = {};
        for (const c of cands) funnel[c.current_stage] = (funnel[c.current_stage] ?? 0) + 1;
        const candIds = cands.map((c) => c.id);
        const lastMoves = candIds.length
          ? await db
              .select({
                candidate_id: stage_history.candidate_id,
                at: stage_history.at,
                to_stage: stage_history.to_stage,
              })
              .from(stage_history)
              .where(inArray(stage_history.candidate_id, candIds))
              .orderBy(desc(stage_history.at))
          : [];
        const seen = new Set<string>();
        const dwell: Record<string, { total: number; n: number; max: number }> = {};
        for (const m of lastMoves) {
          if (seen.has(m.candidate_id)) continue;
          seen.add(m.candidate_id);
          const d = daysSince(m.at) ?? 0;
          const s = (dwell[m.to_stage] ??= { total: 0, n: 0, max: 0 });
          s.total += d;
          s.n++;
          s.max = Math.max(s.max, d);
        }
        const TERMINAL = ["hired", "rejected", "withdrew"];
        const stuck = Object.entries(dwell)
          .filter(([stage]) => !TERMINAL.includes(stage))
          .map(([stage, s]) => ({
            stage,
            candidates: s.n,
            avg_days_waiting: Math.round(s.total / s.n),
            max_days_waiting: s.max,
          }))
          .sort((a, b) => b.avg_days_waiting - a.avg_days_waiting);

        const scores = cands.map((c) => c.ai_score).filter((v): v is number => v != null);
        const pendingApprovals = candIds.length
          ? await db
              .select({ candidate_id: approvals.candidate_id, step_kind: approvals.step_kind })
              .from(approvals)
              .where(and(inArray(approvals.candidate_id, candIds), eq(approvals.status, "pending")))
          : [];
        const upcoming = await db
          .select({
            candidate_id: interviews.candidate_id,
            scheduled_at: interviews.scheduled_at,
            type: interviews.type,
          })
          .from(interviews)
          .where(
            and(
              eq(interviews.job_id, j.id),
              eq(interviews.status, "scheduled"),
              gte(interviews.scheduled_at, new Date().toISOString()),
            ),
          )
          .limit(10);
        const nameOf = (id: string) => cands.find((c) => c.id === id)?.full_name ?? id.slice(0, 8);
        return {
          id: j.id,
          title: j.title,
          status: j.status,
          location: j.location,
          salary_min: j.salary_min,
          salary_max: j.salary_max,
          headcount: j.headcount,
          days_open: daysSince(j.posted_at),
          total_candidates: cands.length,
          hired: funnel["hired"] ?? 0,
          funnel,
          ai_scores: scores.length
            ? {
                avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
                max: Math.max(...scores),
                scored: scores.length,
              }
            : null,
          waiting_by_stage: stuck.slice(0, 5),
          pending_approvals: pendingApprovals.map((p) => ({
            candidate: nameOf(p.candidate_id),
            step: p.step_kind,
          })),
          upcoming_interviews: upcoming.map((i) => ({
            candidate: nameOf(i.candidate_id),
            at: i.scheduled_at,
            type: i.type,
          })),
          public_url: `/tuyen-dung/${j.id}`,
          admin_url: `/vi-tri/${j.id}`,
        };
      }
      case "create_job": {
        if (args.confirmed !== true) return NOT_CONFIRMED;
        const title = String(args.title ?? "").trim();
        if (title.length < 3) return { error: "Thiếu tiêu đề vị trí." };
        const family = (ROLE_FAMILIES as readonly string[]).includes(String(args.role_family))
          ? (String(args.role_family) as (typeof ROLE_FAMILIES)[number])
          : "custom";
        // Criteria weights come from the role family's template (same default
        // the job form uses) so AI scoring works out of the box.
        const template = await db
          .select({ weights: weight_templates.weights })
          .from(weight_templates)
          .where(eq(weight_templates.family, family))
          .get();
        const inserted = await db
          .insert(jobs)
          .values({
            title,
            role_family: family,
            location: typeof args.location === "string" ? args.location.trim() || null : null,
            description:
              typeof args.description === "string" ? args.description.trim() || null : null,
            headcount:
              typeof args.headcount === "number" && args.headcount >= 1
                ? Math.floor(args.headcount)
                : 1,
            salary_min: typeof args.salary_min === "number" ? args.salary_min : null,
            salary_max: typeof args.salary_max === "number" ? args.salary_max : null,
            weights: (template?.weights ?? {}) as never,
            status: "draft",
            created_by: profile.id,
          })
          .returning({ id: jobs.id });
        const jobId = inserted[0]!.id;
        await auditAgent(profile, "jobs", jobId, "agent_create", { title, role_family: family });
        return {
          ok: true,
          message: `Đã tạo vị trí NHÁP "${title}". Muốn đăng công khai, xác nhận rồi dùng set_job_status → open.`,
          job_id: jobId,
          admin_url: `/vi-tri/${jobId}`,
        };
      }
      case "update_job": {
        if (args.confirmed !== true) return NOT_CONFIRMED;
        const j = await resolveJob(String(args.job ?? ""));
        const set: Record<string, unknown> = {};
        if (typeof args.title === "string" && args.title.trim().length >= 3)
          set.title = args.title.trim();
        if (typeof args.description === "string") set.description = args.description.trim() || null;
        if (typeof args.location === "string") set.location = args.location.trim() || null;
        if (typeof args.headcount === "number" && args.headcount >= 1)
          set.headcount = Math.floor(args.headcount);
        if (typeof args.salary_min === "number") set.salary_min = args.salary_min;
        if (typeof args.salary_max === "number") set.salary_max = args.salary_max;
        if (Object.keys(set).length === 0)
          return {
            error: "Không có trường nào để sửa (title/description/location/headcount/salary).",
          };
        await db
          .update(jobs)
          .set(set as never)
          .where(eq(jobs.id, j.id));
        await auditAgent(profile, "jobs", j.id, "agent_update", set);
        return {
          ok: true,
          message: `Đã cập nhật tin "${j.title}": ${Object.keys(set).join(", ")}.`,
          admin_url: `/vi-tri/${j.id}`,
        };
      }
      case "set_job_status": {
        if (args.confirmed !== true) return NOT_CONFIRMED;
        const j = await resolveJob(String(args.job ?? ""));
        const status = String(args.status ?? "");
        if (!(JOB_STATUSES as readonly string[]).includes(status)) {
          return { error: `Trạng thái không hợp lệ: ${status}` };
        }
        await setJobStatus(j.id, status as never);
        await auditAgent(profile, "jobs", j.id, "agent_status", { from: j.status, to: status });
        return {
          ok: true,
          message:
            status === "open"
              ? `Đã ĐĂNG CÔNG KHAI tin "${j.title}" — ứng viên nộp được tại /tuyen-dung/${j.id}.`
              : `Đã đổi trạng thái tin "${j.title}": ${j.status} → ${status}.`,
        };
      }
      // -------------------------- Insight tools --------------------------
      case "search_cv_content": {
        const keyword = String(args.keyword ?? "").trim();
        if (keyword.length < 2) return { error: "Từ khóa quá ngắn." };
        const needle = fold(keyword);
        const rows = await db
          .select({
            id: candidates.id,
            full_name: candidates.full_name,
            current_stage: candidates.current_stage,
            ai_score: candidates.ai_score,
            job_id: candidates.job_id,
            cv_text: candidates.cv_text,
          })
          .from(candidates)
          .where(eq(candidates.is_archived, false))
          .limit(500);
        const hits = rows.filter((r) => r.cv_text && fold(r.cv_text).includes(needle)).slice(0, 10);
        if (hits.length === 0)
          return { message: `Không CV nào chứa "${keyword}" trong ${rows.length} hồ sơ.` };
        return await Promise.all(
          hits.map(async (r) => ({
            id: r.id,
            full_name: r.full_name,
            stage: r.current_stage,
            ai_score: r.ai_score,
            job: await jobTitleOf(r.job_id),
            snippet: snippetAround(r.cv_text!, needle),
          })),
        );
      }
      case "compare_candidates": {
        const list = Array.isArray(args.names_or_ids) ? args.names_or_ids.slice(0, 5) : [];
        if (list.length < 2) return { error: "Cần ít nhất 2 ứng viên để so sánh." };
        const resolved = await Promise.all(list.map((v) => resolveCandidate(String(v))));
        const screenings = await db
          .select({
            candidate_id: ai_screenings.candidate_id,
            criteria: ai_screenings.criteria,
            total: ai_screenings.total,
            created_at: ai_screenings.created_at,
          })
          .from(ai_screenings)
          .where(
            inArray(
              ai_screenings.candidate_id,
              resolved.map((c) => c.id),
            ),
          )
          .orderBy(desc(ai_screenings.created_at));
        const latestByCand = new Map<string, (typeof screenings)[number]>();
        for (const s of screenings)
          if (!latestByCand.has(s.candidate_id)) latestByCand.set(s.candidate_id, s);
        return await Promise.all(
          resolved.map(async (c) => {
            const s = latestByCand.get(c.id);
            const crit = (s?.criteria ?? {}) as Record<string, { score?: number }>;
            return {
              full_name: c.full_name,
              job: await jobTitleOf(c.job_id),
              stage: c.current_stage,
              total: s?.total ?? c.ai_score,
              criteria_scores: Object.fromEntries(
                Object.entries(crit).map(([k, v]) => [k, v?.score ?? null]),
              ),
              detail_url: `/ung-vien/${c.id}`,
            };
          }),
        );
      }
      case "candidate_timeline": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const [moves, ivs, mails] = await Promise.all([
          db
            .select({
              at: stage_history.at,
              from_stage: stage_history.from_stage,
              to_stage: stage_history.to_stage,
              notes: stage_history.notes,
            })
            .from(stage_history)
            .where(eq(stage_history.candidate_id, c.id))
            .orderBy(desc(stage_history.at))
            .limit(20),
          db
            .select({
              scheduled_at: interviews.scheduled_at,
              type: interviews.type,
              status: interviews.status,
            })
            .from(interviews)
            .where(eq(interviews.candidate_id, c.id))
            .limit(10),
          db
            .select({
              created_at: email_messages.created_at,
              subject: email_messages.subject,
              status: email_messages.status,
            })
            .from(email_messages)
            .where(eq(email_messages.candidate_id, c.id))
            .orderBy(desc(email_messages.created_at))
            .limit(10),
        ]);
        return {
          candidate: c.full_name,
          current_stage: c.current_stage,
          stage_moves: moves,
          interviews: ivs,
          emails: mails,
          detail_url: `/ung-vien/${c.id}`,
        };
      }
      case "report_snapshot": {
        const days = Math.min(365, Math.max(7, Number(args.days) || 90));
        const to = new Date();
        const from = new Date(Date.now() - days * dayMs);
        const filter = parseReportFilter({
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        });
        const p = await buildReportPayload(filter);
        return {
          period_days: days,
          total_candidates: p.total_candidates,
          funnel: p.funnel,
          time_to_hire: p.time_to_hire,
          source_effectiveness: p.source_effectiveness,
          hires_per_month: p.hires_per_month,
          report_url: "/bao-cao",
        };
      }
      case "email_queue_status": {
        const rows = await db
          .select({
            subject: email_messages.subject,
            to_emails: email_messages.to_emails,
            status: email_messages.status,
            created_at: email_messages.created_at,
            error: email_messages.error,
          })
          .from(email_messages)
          .where(
            inArray(email_messages.status, ["pending_approval", "queued", "failed"] as never[]),
          )
          .orderBy(desc(email_messages.created_at))
          .limit(15);
        return {
          items: rows,
          note: "Duyệt/hủy email tại trang Email (/email) — không duyệt được từ chat.",
        };
      }
      case "suggest_past_candidates": {
        const j = await resolveJob(String(args.job ?? ""));
        const rows = await db
          .select({
            id: candidates.id,
            full_name: candidates.full_name,
            ai_score: candidates.ai_score,
            current_stage: candidates.current_stage,
            email: candidates.email,
            phone: candidates.phone,
            job_id: candidates.job_id,
          })
          .from(candidates)
          .innerJoin(jobs, eq(jobs.id, candidates.job_id))
          .where(
            and(
              eq(jobs.role_family, j.role_family),
              ne(candidates.job_id, j.id),
              ne(candidates.current_stage, "hired"),
              gte(candidates.ai_score, 55),
            ),
          )
          .orderBy(desc(candidates.ai_score))
          .limit(6);
        if (rows.length === 0)
          return {
            message: `Chưa có ứng viên cũ nào cùng nhóm "${j.role_family}" đạt điểm AI ≥ 55.`,
          };
        return await Promise.all(
          rows.map(async (r) => ({
            ...r,
            previous_job: await jobTitleOf(r.job_id),
            detail_url: `/ung-vien/${r.id}`,
          })),
        );
      }
      // -------------------------- Small actions --------------------------
      case "add_candidate_note": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const note = String(args.note ?? "").trim();
        if (!note) return { error: "Ghi chú trống." };
        const stamp = new Intl.DateTimeFormat("vi-VN", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(new Date());
        const appended = `${c.notes ? `${c.notes}\n` : ""}[${stamp} — Trợ lý AI] ${note.slice(0, 500)}`;
        await db.update(candidates).set({ notes: appended }).where(eq(candidates.id, c.id));
        await auditAgent(profile, "candidates", c.id, "agent_note", { note: note.slice(0, 200) });
        return { ok: true, message: `Đã thêm ghi chú vào hồ sơ ${c.full_name}.` };
      }
      case "cancel_interview": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const upcoming = await db
          .select({
            id: interviews.id,
            scheduled_at: interviews.scheduled_at,
            type: interviews.type,
          })
          .from(interviews)
          .where(and(eq(interviews.candidate_id, c.id), eq(interviews.status, "scheduled")))
          .orderBy(interviews.scheduled_at);
        if (upcoming.length === 0)
          return { error: `${c.full_name} không có buổi phỏng vấn nào đang được lên lịch.` };
        if (upcoming.length > 1)
          return {
            error:
              `${c.full_name} có ${upcoming.length} buổi phỏng vấn: ` +
              upcoming.map((i) => `${i.scheduled_at} (${i.type})`).join(", ") +
              ". Hỏi người dùng muốn hủy buổi nào (hiện chỉ hủy được khi còn đúng 1 buổi).",
          };
        if (args.confirmed !== true) return NOT_CONFIRMED;
        const target = upcoming[0]!;
        await cancelInterview(
          target.id,
          typeof args.reason === "string" && args.reason.trim()
            ? args.reason.trim()
            : "Hủy bởi Trợ lý AI theo yêu cầu người dùng",
        );
        await auditAgent(profile, "interviews", target.id, "agent_cancel", {
          candidate: c.full_name,
          scheduled_at: target.scheduled_at,
        });
        return {
          ok: true,
          message: `Đã hủy buổi phỏng vấn ${target.scheduled_at} của ${c.full_name} (kèm hủy sự kiện Outlook nếu có).`,
        };
      }
      default:
        return { error: `Công cụ không tồn tại: ${name}` };
    }
  };
}

function systemPrompt(profile: SessionProfile): string {
  const nowVn = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  return `Bạn là Trợ lý Mắt Việt HR — trợ lý tuyển dụng nội bộ, nói tiếng Việt, ngắn gọn và hữu ích.
Người dùng hiện tại: ${profile.full_name ?? "—"} (vai trò: ${profile.role}). Bây giờ là ${nowVn} (giờ Việt Nam).

Nguyên tắc:
- Bạn hành động DƯỚI DANH NGHĨA và TRONG PHẠM VI QUYỀN của người dùng hiện tại — không hơn. Nếu công cụ báo ngoài thẩm quyền, nói thẳng cho người dùng, đừng tìm cách vòng qua. Mọi thao tác đều được ghi nhật ký với tên người dùng.
- Dùng công cụ để LÀM việc thay vì chỉ mô tả. Sau khi làm xong, tóm tắt kết quả 1-2 câu kèm đường dẫn nếu có.
- XÁC NHẬN TRƯỚC KHI THAY ĐỔI: với create_job / update_job / set_job_status / cancel_interview / move_candidate_stage sang hired-rejected-withdrew, luôn tóm tắt việc định làm và hỏi người dùng đồng ý không. Chỉ khi họ trả lời đồng ý mới gọi công cụ với confirmed=true. Không bao giờ tự đặt confirmed=true khi chưa được đồng ý trong hội thoại.
- Vị trí tạo mới luôn là NHÁP — muốn hiện lên trang tuyển dụng công khai phải set_job_status → open (một lần xác nhận riêng).
- Khi so sánh ứng viên hoặc liệt kê nhiều dòng dữ liệu, trình bày bằng BẢNG Markdown gọn (cột tiếng Việt).
- Ngày giờ người dùng nói (ví dụ "thứ Năm 2 giờ chiều") phải đổi sang ISO 8601 với múi giờ +07:00 trước khi gọi schedule_interview.
- Email soạn ra LUÔN ở trạng thái chờ duyệt — nhắc người dùng vào trang Email để duyệt trước khi gửi. Duyệt email và duyệt hồ sơ KHÔNG làm được từ chat.
- Không bịa dữ liệu: nếu công cụ trả lỗi hoặc không thấy, nói thẳng và gợi ý cách khác.
- Nếu trùng tên nhiều ứng viên/vị trí, hỏi lại người dùng chọn cái nào.
- Khi cần dùng công cụ, gọi qua cơ chế tool-calling thật — KHÔNG viết "[gọi công cụ …]" trong câu trả lời.
- Tuyệt đối không thực hiện thao tác ngoài các công cụ được cấp.`;
}

export interface AgentTurnResult {
  reply: string;
  actions: Array<{ tool: string; summary: string }>;
}

export async function runAgentTurn(
  profile: SessionProfile,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AgentTurnResult> {
  if (profile.role !== "admin" && profile.role !== "hr") {
    throw new Error("Trợ lý AI hiện chỉ mở cho Admin và HR.");
  }
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(profile) },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
  ];
  // The model only ever SEES the tools this user's role may use (and the
  // executor re-checks — belt and braces).
  const visibleTools = TOOLS.filter((t) => TOOL_POLICY[t.name]?.roles.includes(profile.role));
  const { text, executions } = await aiWithTools({
    messages,
    tools: visibleTools,
    execute: makeExecutor(profile),
    maxIterations: 6,
    feature: "agent",
    userId: profile.id,
  });
  return {
    reply: text,
    actions: executions.map((e) => {
      const r = e.result as { message?: string; error?: string } | unknown[];
      const summary = Array.isArray(r)
        ? `${e.name}: ${r.length} kết quả`
        : ((r as { message?: string; error?: string }).message ??
          (r as { error?: string }).error ??
          e.name);
      return { tool: e.name, summary };
    }),
  };
}
