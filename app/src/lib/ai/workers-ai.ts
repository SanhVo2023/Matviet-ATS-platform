import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ZodType, ZodTypeDef } from "zod";

/**
 * Workers AI provider (ADR 0013) — replaces the geo-gated Gemini API.
 * Runs on the same Cloudflare platform as the app: no egress, no region blocks.
 *
 * Default model: Llama 3.3 70B (fp8-fast) — confirmed json_schema structured
 * output + function calling, strong multilingual instruct quality, 300 req/min,
 * ~$0.29/M in + $2.25/M out (≈$0.005 per CV scoring at our sizes).
 * Swappable at runtime from the admin page (app_settings) or the AI_MODEL var.
 */

export const DEFAULT_AI_MODEL = "@cf/moonshotai/kimi-k2.6";

/** Models offered in the admin UI (Sanh's picks, 2026-07-03 + llama legacy). */
export const AI_MODEL_CHOICES: Array<{ id: string; label: string; note: string }> = [
  {
    id: "@cf/moonshotai/kimi-k2.6",
    label: "Kimi K2.6 (khuyến nghị)",
    note: "1T-class · structured outputs + tool calling · $0.95/$4.00 mỗi triệu token (~1¢/CV)",
  },
  {
    id: "@cf/nvidia/nemotron-3-120b-a12b",
    label: "Nemotron-3 120B",
    note: "Suy luận mạnh, giá tốt · $0.50/$1.50",
  },
  {
    id: "@cf/zai-org/glm-5.2",
    label: "GLM-5.2",
    note: "Flagship đa ngôn ngữ (100+) · $1.40/$4.40",
  },
  {
    id: "@cf/google/gemma-4-26b-a4b-it",
    label: "Gemma-4 26B (tiết kiệm)",
    note: "140 ngôn ngữ, rẻ nhất · $0.10/$0.30 — tool calling có thể yếu hơn",
  },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Llama 3.3 70B (cũ)",
    note: "Model mặc định trước đây · $0.29/$2.25 — JSON mode hay lỗi 5024 với schema phức tạp",
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
  "@cf/moonshotai/kimi-k2.6": { in: 0.95, out: 4.0 },
  "@cf/nvidia/nemotron-3-120b-a12b": { in: 0.5, out: 1.5 },
  "@cf/zai-org/glm-5.2": { in: 1.4, out: 4.4 },
  "@cf/google/gemma-4-26b-a4b-it": { in: 0.1, out: 0.3 },
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
  tool_calls?: Array<{
    name?: string;
    arguments?: unknown;
    function?: { name?: string; arguments?: unknown };
  }>;
  choices?: Array<{
    message?: {
      content?: unknown;
      tool_calls?: Array<{
        function?: { name?: string; arguments?: unknown };
        name?: string;
        arguments?: unknown;
      }>;
    };
  }>;
  output_text?: unknown;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Model families answer in different dialects: classic Workers AI ({response}),
 * OpenAI-style ({choices[0].message}), some reasoning models ({output_text}).
 * Normalize to one shape so Kimi/GLM/Nemotron/Gemma/Llama all work.
 */
function normalizeResponse(r: RawAiResponse): {
  content: unknown;
  toolCalls: Array<{ name: string; arguments: unknown }>;
} {
  const msg = r.choices?.[0]?.message;
  const content = r.response ?? msg?.content ?? r.output_text ?? null;
  const rawCalls = r.tool_calls ?? msg?.tool_calls ?? [];
  const toolCalls = rawCalls
    .map((c) => ({
      name: c.function?.name ?? c.name ?? "",
      arguments: c.function?.arguments ?? c.arguments ?? {},
    }))
    .filter((c) => c.name);
  return { content, toolCalls };
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

/** Tolerant JSON extraction: strips markdown fences and surrounding prose. */
function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    /* fall through */
  }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(t.slice(first, last + 1));
    } catch {
      /* fall through */
    }
  }
  return null;
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
  const { content } = normalizeResponse(r);
  const text =
    typeof content === "string" ? content : content != null ? JSON.stringify(content) : "";
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
    /** Input type is unconstrained so schemas with .transform() coercions fit. */
    zod: ZodType<T, ZodTypeDef, unknown>;
    maxTokens?: number;
    temperature?: number;
  } & AiCallMeta,
): Promise<{ data: T; raw: unknown; usage: AiUsage }> {
  const messages: ChatMessage[] = [
    { role: "system", content: args.system },
    { role: "user", content: args.user },
  ];
  let usage: AiUsage = { in: 0, out: 0 };
  // Constrained decoding (json_schema) can fail with Workers AI error 5024
  // ("JSON Model couldn't be met") on complex schemas. When that happens we
  // drop to free-form JSON with the schema embedded in the prompt — the Zod
  // pass below stays the correctness gate either way.
  let useSchemaMode = true;

  for (let attempt = 0; attempt < 3; attempt++) {
    let r: RawAiResponse;
    try {
      r = await run(
        {
          messages: useSchemaMode
            ? messages
            : [
                messages[0]!,
                {
                  role: "user" as const,
                  content: `${args.user}\n\nTrả về DUY NHẤT một JSON hợp lệ đúng schema sau (không markdown, không giải thích):\n${JSON.stringify(args.jsonSchema)}`,
                },
                ...messages.slice(2),
              ],
          max_tokens: args.maxTokens ?? 3072,
          temperature: args.temperature ?? 0.15,
          ...(useSchemaMode
            ? { response_format: { type: "json_schema", json_schema: args.jsonSchema } }
            : {}),
        },
        args,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (useSchemaMode && (msg.includes("5024") || /json model/i.test(msg))) {
        useSchemaMode = false; // same attempt, free-form fallback
        attempt--;
        continue;
      }
      throw err;
    }
    const u = usageOf(r);
    usage = { in: usage.in + u.in, out: usage.out + u.out };

    let raw: unknown = normalizeResponse(r).content;
    if (typeof raw === "string") {
      raw = extractJson(raw);
    }
    if (raw == null) {
      // Diagnostic: unknown model response dialect — dump the envelope shape.
      console.warn(
        "[aiJson] unparseable response envelope:",
        (JSON.stringify(r) ?? "undefined").slice(0, 900),
      );
    }
    if (raw != null) {
      const parsed = args.zod.safeParse(raw);
      if (parsed.success) return { data: parsed.data, raw, usage };
      if (attempt === 0) {
        messages.push(
          { role: "assistant", content: (JSON.stringify(raw) ?? "null").slice(0, 4000) },
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
  // No "Schema" keyword here on purpose: unparseable output is transient model
  // flakiness (retriable with backoff), unlike a genuine Zod schema mismatch.
  throw new Error("AI trả về dữ liệu không đọc được (lỗi tạm thời) — sẽ thử lại.");
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
  // Reasoning models (Kimi/GLM/Nemotron) spend output tokens THINKING before
  // emitting the tool call — a tight budget starves the answer entirely
  // (finish_reason=length, empty content). max_tokens is a ceiling, not a spend.
  let tokenBudget = args.maxTokens ?? 6144;
  let starvedRetry = false;

  for (let i = 0; i < maxIterations; i++) {
    const r = await run(
      {
        messages,
        max_tokens: tokenBudget,
        temperature: 0.2,
        tools: args.tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      },
      args,
    );
    usage = { in: usage.in + usageOf(r).in, out: usage.out + usageOf(r).out };

    const normalized = normalizeResponse(r);
    let calls = normalized.toolCalls;
    if (calls.length === 0) {
      const text = typeof normalized.content === "string" ? normalized.content.trim() : "";
      // Models sometimes IMITATE the tool-call transcript as plain text instead
      // of emitting a real tool_call — parse and execute it as one.
      const imitated = text.match(
        /(?:\[)?(?:gọi công cụ|call tool)\s+(\w+)\s*\((\{[\s\S]*?\})?\)(?:\])?/i,
      );
      if (imitated && args.tools.some((t) => t.name === imitated[1])) {
        calls = [{ name: imitated[1]!, arguments: imitated[2] ?? "{}" }];
      } else if (!text && !starvedRetry) {
        // Empty content + no tool calls = the reasoning budget ran out before
        // the answer started. One retry with double the ceiling.
        starvedRetry = true;
        tokenBudget *= 2;
        continue;
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
