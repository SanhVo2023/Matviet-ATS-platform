import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ZodType } from "zod";

/**
 * Workers AI provider (ADR 0013) — replaces the geo-gated Gemini API.
 * Runs on the same Cloudflare platform as the app: no egress, no region blocks.
 *
 * Default model: Llama 3.3 70B (fp8-fast) — confirmed json_schema structured
 * output + function calling, strong multilingual instruct quality, 300 req/min,
 * ~$0.29/M in + $2.25/M out (≈$0.005 per CV scoring at our sizes).
 * Swappable at runtime from the admin page (app_settings) or the AI_MODEL var.
 */

export const DEFAULT_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/** Models offered in the admin UI (all text-gen; verify JSON-mode before adding more). */
export const AI_MODEL_CHOICES: Array<{ id: string; label: string; note: string }> = [
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Llama 3.3 70B (khuyến nghị)",
    note: "JSON mode + tool calling đã kiểm chứng · $0.29/$2.25 mỗi triệu token",
  },
  {
    id: "@cf/openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    note: "Suy luận mạnh hơn, rẻ đầu ra · $0.35/$0.75 — kiểm tra JSON mode trước khi dùng cho chấm điểm",
  },
  {
    id: "@cf/qwen/qwen3-30b-a3b-fp8",
    label: "Qwen3 30B (tiết kiệm)",
    note: "Rẻ nhất · $0.051/$0.335 — chất lượng tiếng Việt thấp hơn",
  },
];

let modelOverride: (() => Promise<string | null>) | null = null;
let enabledCheck: (() => Promise<boolean>) | null = null;
let usageSink:
  | ((entry: { feature: string; model: string; usage: AiUsage; userId?: string | null }) => void)
  | null = null;

/** Wired once from the server layer (settings repo + usage log) to avoid an import cycle. */
export function configureAiRuntime(hooks: {
  modelOverride: () => Promise<string | null>;
  enabledCheck: () => Promise<boolean>;
  usageSink: (entry: {
    feature: string;
    model: string;
    usage: AiUsage;
    userId?: string | null;
  }) => void;
}): void {
  modelOverride = hooks.modelOverride;
  enabledCheck = hooks.enabledCheck;
  usageSink = hooks.usageSink;
}

export async function aiModelId(): Promise<string> {
  const fromSettings = modelOverride ? await modelOverride().catch(() => null) : null;
  return fromSettings ?? process.env.AI_MODEL ?? DEFAULT_AI_MODEL;
}

/** USD per 1M tokens {in, out} — keep in sync with developers.cloudflare.com/workers-ai/platform/pricing */
const PRICING: Record<string, { in: number; out: number }> = {
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": { in: 0.293, out: 2.253 },
  "@cf/openai/gpt-oss-120b": { in: 0.35, out: 0.75 },
  "@cf/qwen/qwen3-30b-a3b-fp8": { in: 0.051, out: 0.335 },
};

export function computeAiCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return Math.round(((tokensIn / 1e6) * p.in + (tokensOut / 1e6) * p.out) * 1e6) / 1e6;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** tool-result messages reference the call they answer */
  name?: string;
}

export interface AiToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface AiUsage {
  in: number;
  out: number;
}

export interface AiCallMeta {
  /** scoring | agent | email_draft | jd_generate | interview_questions | candidate_summary | general */
  feature?: string;
  userId?: string | null;
}

interface RawAiResponse {
  response?: unknown;
  tool_calls?: Array<{ name: string; arguments: unknown }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

async function getAi() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.AI) throw new Error("AI binding chưa cấu hình (wrangler.jsonc → ai.binding).");
  return env.AI;
}

async function run(input: Record<string, unknown>, meta?: AiCallMeta): Promise<RawAiResponse> {
  if (enabledCheck && !(await enabledCheck().catch(() => true))) {
    throw new Error("Tính năng AI đang tắt (admin đã tắt trong Cài đặt → Hệ thống).");
  }
  const ai = await getAi();
  const model = await aiModelId();
  const result = await (ai.run as (m: string, i: unknown) => Promise<unknown>)(model, {
    max_tokens: 2048,
    ...input,
  });
  const raw = result as RawAiResponse;
  if (usageSink) {
    try {
      usageSink({
        feature: meta?.feature ?? "general",
        model,
        usage: usageOf(raw),
        userId: meta?.userId ?? null,
      });
    } catch {
      // usage logging must never break inference
    }
  }
  return raw;
}

function usageOf(r: RawAiResponse): AiUsage {
  return { in: r.usage?.prompt_tokens ?? 0, out: r.usage?.completion_tokens ?? 0 };
}

/** Plain chat completion → final text. */
export async function aiChat(
  messages: ChatMessage[],
  opts?: { maxTokens?: number; temperature?: number } & AiCallMeta,
): Promise<{ text: string; usage: AiUsage }> {
  const r = await run(
    {
      messages,
      max_tokens: opts?.maxTokens ?? 1024,
      temperature: opts?.temperature ?? 0.4,
    },
    opts,
  );
  const text = typeof r.response === "string" ? r.response : JSON.stringify(r.response ?? "");
  if (!text) throw new Error("AI trả về rỗng.");
  return { text, usage: usageOf(r) };
}

/**
 * Structured output via json_schema mode, validated twice (model-side schema +
 * our Zod). One corrective retry on validation failure; a final failure throws
 * with "Schema" in the message so the scoring queue classifies it non-retriable.
 */
export async function aiJson<T>(
  args: {
    system: string;
    user: string;
    jsonSchema: Record<string, unknown>;
    zod: ZodType<T>;
    maxTokens?: number;
    temperature?: number;
  } & AiCallMeta,
): Promise<{ data: T; raw: unknown; usage: AiUsage }> {
  const messages: ChatMessage[] = [
    { role: "system", content: args.system },
    { role: "user", content: args.user },
  ];
  let usage: AiUsage = { in: 0, out: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await run(
      {
        messages,
        max_tokens: args.maxTokens ?? 3072,
        temperature: args.temperature ?? 0.15,
        response_format: { type: "json_schema", json_schema: args.jsonSchema },
      },
      args,
    );
    const u = usageOf(r);
    usage = { in: usage.in + u.in, out: usage.out + u.out };

    let raw: unknown = r.response;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }
    if (raw !== null) {
      const parsed = args.zod.safeParse(raw);
      if (parsed.success) return { data: parsed.data, raw, usage };
      if (attempt === 0) {
        messages.push(
          { role: "assistant", content: JSON.stringify(raw).slice(0, 4000) },
          {
            role: "user",
            content: `Kết quả chưa đúng schema: ${parsed.error.issues[0]?.path.join(".")} — ${parsed.error.issues[0]?.message}. Trả về lại JSON đầy đủ, đúng schema, không thêm chữ nào ngoài JSON.`,
          },
        );
        continue;
      }
      throw new Error(`Schema không khớp: ${parsed.error.issues[0]?.message}`);
    }
    if (attempt === 0) {
      messages.push({
        role: "user",
        content: "Chỉ trả về JSON hợp lệ đúng schema, không markdown.",
      });
      continue;
    }
  }
  throw new Error("Schema không khớp: AI không trả về JSON hợp lệ.");
}

export interface ToolExecution {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

/**
 * Function-calling loop for the staff agent. The model requests tools; we
 * execute via `execute` (which must enforce authorization itself) and feed
 * results back until the model answers in plain text or maxIterations hits.
 */
export async function aiWithTools(
  args: {
    messages: ChatMessage[];
    tools: AiToolDef[];
    execute: (name: string, toolArgs: Record<string, unknown>) => Promise<unknown>;
    maxIterations?: number;
    maxTokens?: number;
  } & AiCallMeta,
): Promise<{ text: string; usage: AiUsage; executions: ToolExecution[] }> {
  const messages = [...args.messages];
  const executions: ToolExecution[] = [];
  let usage: AiUsage = { in: 0, out: 0 };
  const maxIterations = args.maxIterations ?? 6;

  for (let i = 0; i < maxIterations; i++) {
    const r = await run(
      {
        messages,
        max_tokens: args.maxTokens ?? 1024,
        temperature: 0.2,
        tools: args.tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      },
      args,
    );
    usage = { in: usage.in + usageOf(r).in, out: usage.out + usageOf(r).out };

    let calls = r.tool_calls ?? [];
    if (calls.length === 0) {
      const text = typeof r.response === "string" ? r.response.trim() : "";
      // Models sometimes IMITATE the tool-call transcript as plain text instead
      // of emitting a real tool_call — parse and execute it as one.
      const imitated = text.match(
        /(?:\[)?(?:gọi công cụ|call tool)\s+(\w+)\s*\((\{[\s\S]*?\})?\)(?:\])?/i,
      );
      if (imitated && args.tools.some((t) => t.name === imitated[1])) {
        calls = [{ name: imitated[1]!, arguments: imitated[2] ?? "{}" }];
      } else {
        return { text: text || "Xin lỗi, tôi chưa xử lý được yêu cầu này.", usage, executions };
      }
    }

    for (const call of calls) {
      let toolArgs: Record<string, unknown> = {};
      if (typeof call.arguments === "string") {
        try {
          toolArgs = JSON.parse(call.arguments) as Record<string, unknown>;
        } catch {
          toolArgs = {};
        }
      } else if (call.arguments && typeof call.arguments === "object") {
        toolArgs = call.arguments as Record<string, unknown>;
      }

      let result: unknown;
      try {
        result = await args.execute(call.name, toolArgs);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : "Tool thất bại" };
      }
      executions.push({ name: call.name, args: toolArgs, result });
      // Terse, non-imitable history: the tool RESULT carries the information;
      // the assistant marker is minimal so the model doesn't copy its shape.
      messages.push(
        { role: "assistant", content: `→ ${call.name}` },
        {
          role: "tool",
          name: call.name,
          content: JSON.stringify({ tool: call.name, args: toolArgs, result }).slice(0, 6000),
        },
      );
    }
  }

  return {
    text: "Tôi đã thực hiện các bước nhưng chưa thể hoàn tất trong giới hạn cho phép — vui lòng thử yêu cầu cụ thể hơn.",
    usage,
    executions,
  };
}
