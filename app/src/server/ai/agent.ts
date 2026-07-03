import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, jobs, interviews, approvals } from "@/db/schema";
import { aiWithTools, aiChat, type AiToolDef, type ChatMessage } from "@/lib/ai/workers-ai";
import "@/server/ai/runtime";
import { changeStage } from "@/server/candidates/service";
import { scheduleInterview } from "@/server/interviews/service";
import { startApproval } from "@/server/approvals/engine";
import { enqueueOutbound } from "@/server/email/repository";
import { getHrDashboardData } from "@/server/dashboard/queries";
import type { SessionProfile } from "@/lib/auth";

/**
 * Trợ lý Mắt Việt HR — the staff agent (ADR 0013 §agent).
 *
 * Safety model:
 *  - Available to admin/hr only (enforced at the API route AND here).
 *  - Every tool runs server-side against the caller's own profile; tools are
 *    the same service functions the UI buttons call — no privileged bypass.
 *  - Outward-facing actions are NEVER direct: emails land as pending_approval
 *    drafts. Pipeline moves + interview scheduling are internal and match
 *    what the caller could do by hand in the UI.
 */

const TOOLS: AiToolDef[] = [
  {
    name: "search_candidates",
    description:
      "Tìm ứng viên theo tên (một phần cũng được) và/hoặc giai đoạn pipeline. Trả về danh sách gọn: id, tên, giai đoạn, vị trí, điểm AI.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Một phần tên ứng viên (có dấu hoặc không)" },
        stage: {
          type: "string",
          description: "Giai đoạn pipeline, ví dụ: new, screened, interview_scheduled, recommended",
        },
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
      "Chuyển ứng viên sang giai đoạn pipeline khác. Các giai đoạn hợp lệ: new, screening, screened, interview_scheduled, interviewed, test_sent, test_done, recommended, salary_deal, bod_review, tap_doan_review, offer_sent, offer_accepted, hired, rejected, withdrew.",
    parameters: {
      type: "object",
      properties: {
        name_or_id: { type: "string" },
        stage: { type: "string", description: "Giai đoạn đích (giá trị enum tiếng Anh ở trên)" },
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

function makeExecutor(profile: SessionProfile) {
  return async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const db = await getDb();
    switch (name) {
      case "search_candidates": {
        const conds = [eq(candidates.is_archived, false)];
        const stage = typeof args.stage === "string" ? args.stage.trim() : "";
        if (stage) conds.push(eq(candidates.current_stage, stage as never));
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
        const filtered = (q ? rows.filter((r) => fold(r.full_name).includes(q)) : rows).slice(
          0,
          12,
        );
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
        const stage = String(args.stage ?? "");
        await changeStage(c.id, stage as never);
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
        return {
          ok: true,
          message: `Đã đặt lịch phỏng vấn ${type === "video" ? "online (Teams)" : type === "phone" ? "điện thoại" : "trực tiếp"} cho ${c.full_name} lúc ${scheduledAt.toISOString()} (${inviteNote}).`,
          interview_url: `/phong-van/${r.id}`,
        };
      }
      case "start_approval": {
        const c = await resolveCandidate(String(args.name_or_id ?? ""));
        const r = await startApproval(c.id);
        return {
          ok: true,
          message: `Đã tạo quy trình duyệt cho ${c.full_name} (${r.approval_ids.length} bước).`,
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
- Dùng công cụ để LÀM việc thay vì chỉ mô tả. Sau khi làm xong, tóm tắt kết quả 1-2 câu kèm đường dẫn nếu có.
- Ngày giờ người dùng nói (ví dụ "thứ Năm 2 giờ chiều") phải đổi sang ISO 8601 với múi giờ +07:00 trước khi gọi schedule_interview.
- Email soạn ra LUÔN ở trạng thái chờ duyệt — nhắc người dùng vào trang Email để duyệt trước khi gửi.
- Không bịa dữ liệu: nếu công cụ trả lỗi hoặc không thấy, nói thẳng và gợi ý cách khác.
- Nếu trùng tên nhiều ứng viên, hỏi lại người dùng chọn ai.
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
  const { text, executions } = await aiWithTools({
    messages,
    tools: TOOLS,
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
