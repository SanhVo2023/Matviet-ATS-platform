import "server-only";
import { z } from "zod";
import { aiJson } from "@/lib/ai/workers-ai";
import { JobInputSchema, ROLE_FAMILIES, type JobInput } from "@/lib/validation/job";
import { DEFAULT_WEIGHT_TEMPLATES } from "@/lib/constants";
import { generateJobContent } from "@/server/jobs/ai-content";
import { createJobWithAssignments } from "@/server/jobs/service";
import { t } from "@/lib/i18n";
import { createProposal, type ProposalRow } from "./repository";
import type { ExecuteActor, ExecuteResult } from "./execute";

/**
 * job_from_intent (ADR 0020) — the one GENERATIVE proposal kind. One
 * sentence in the command bar ("cần 2 nhân viên bán kính cho cửa hàng Quận 7,
 * lương 8-12tr") becomes a fully-drafted job card: parsed fields + AI JD +
 * role-family weight template. Approve = job goes live.
 */

const IntentSchema = z.object({
  title: z.string().min(2).max(200),
  role_family: z.enum(ROLE_FAMILIES),
  flow_type: z.enum(["staff", "management"]),
  headcount: z.number().int().min(1).max(100).default(1),
  location: z.string().max(200).nullable().default(null),
  salary_min: z.number().int().nonnegative().nullable().default(null),
  salary_max: z.number().int().nonnegative().nullable().default(null),
});

const INTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Chức danh tuyển dụng, tiếng Việt" },
    role_family: { type: "string", enum: [...ROLE_FAMILIES] },
    flow_type: { type: "string", enum: ["staff", "management"] },
    headcount: { type: "integer" },
    location: { type: ["string", "null"] },
    salary_min: { type: ["integer", "null"], description: "VND, ví dụ 8000000" },
    salary_max: { type: ["integer", "null"], description: "VND" },
  },
  required: [
    "title",
    "role_family",
    "flow_type",
    "headcount",
    "location",
    "salary_min",
    "salary_max",
  ],
};

export async function proposeJobFromIntent(
  intentText: string,
): Promise<{ id: string; summary: string } | { error: string }> {
  try {
    const { data: intent } = await aiJson({
      system:
        "Bạn phân tích yêu cầu tuyển dụng của Mắt Việt (chuỗi cửa hàng mắt kính bán lẻ Việt Nam) thành dữ liệu có cấu trúc. " +
        "role_family: sales=nhân viên bán hàng/tư vấn; optician=khúc xạ viên/kỹ thuật; office=văn phòng/hành chính/kế toán; manager=quản lý/trưởng; custom=khác. " +
        "flow_type: management khi là vị trí quản lý (cần BOD duyệt), còn lại staff. " +
        "Lương ghi theo VND (8tr = 8000000). Không bịa thông tin không có trong yêu cầu.",
      user: intentText.slice(0, 1000),
      jsonSchema: INTENT_JSON_SCHEMA,
      zod: IntentSchema,
      maxTokens: 4096, // reasoning-model headroom
      temperature: 0.1,
      feature: "agent_job_intent",
    });

    const content = await generateJobContent({
      title: intent.title,
      roleFamily: intent.role_family,
      location: intent.location,
      feature: "agent_job_intent",
    });

    const jobInput: JobInput = JobInputSchema.parse({
      title: intent.title,
      role_family: intent.role_family,
      flow_type: intent.flow_type,
      headcount: intent.headcount,
      location: intent.location,
      salary_min: intent.salary_min,
      salary_max: intent.salary_max,
      description: content.description_html,
      requirements_html: content.requirements_html,
      weights: DEFAULT_WEIGHT_TEMPLATES[intent.role_family] ?? DEFAULT_WEIGHT_TEMPLATES.sales,
      hiring_manager_ids: [],
    });

    const summary = `Tạo vị trí "${intent.title}" — ${intent.headcount} người${intent.location ? ` · ${intent.location}` : ""}`;
    const row = await createProposal({
      jobId: null,
      kind: "job_from_intent",
      summary,
      reasoning:
        `Phân tích từ yêu cầu: "${intentText.slice(0, 200)}". ` +
        `Nhóm vị trí: ${t.roleFamily[intent.role_family]} · quy trình ${intent.flow_type === "management" ? "quản lý" : "nhân viên"}. ` +
        `Mô tả + yêu cầu do AI soạn; trọng số chấm CV theo mẫu nhóm vị trí. Duyệt = đăng tuyển ngay.`,
      payload: { intent_text: intentText.slice(0, 500), job_input: jobInput },
      dedupeKey: `jfi:${crypto.randomUUID()}`, // every intent is its own card
    });
    if (!row) return { error: "Không tạo được đề xuất" };
    return { id: row.id, summary };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Không phân tích được yêu cầu" };
  }
}

export async function executeJobFromIntent(
  p: ProposalRow,
  actor: ExecuteActor,
): Promise<ExecuteResult> {
  const payload = p.payload as { job_input?: unknown };
  const parsed = JobInputSchema.safeParse(payload.job_input);
  if (!parsed.success) return { ok: false, error: "Dữ liệu vị trí không hợp lệ" };
  const { id } = await createJobWithAssignments(parsed.data, "open", actor.id);
  return {
    ok: true,
    executedRef: { job_id: id },
    message: `Đã đăng vị trí "${parsed.data.title}"`,
  };
}
