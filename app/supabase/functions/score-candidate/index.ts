// Edge Function: score-candidate
// Async CV scoring worker. Reads from public.scoring_queue, calls Gemini twice,
// validates evidence, persists ai_screenings + candidate status.
//
// Auth: requires Bearer ${SCORING_INTERNAL_SECRET}. Service role bypasses RLS;
// callers MUST be the Next.js Server Actions or the cron drain.
//
// Trigger: POST { candidate_id?: string }. If omitted, drains the oldest queued row.
//
// Failure handling per master plan §26.5:
//   - Gemini 429 → retry 5/15/45s, max 3 attempts
//   - Quota exhausted → next_retry_at = next midnight UTC+7
//   - Schema/parse failures → no retry, candidate flagged ai_screening_status='failed'
//   - DOCX without pdf_storage_path → fail with reason "Cần chuyển đổi DOCX sang PDF"

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { encodeBase64 } from "jsr:@std/encoding/base64";

import { CRITERION_CODES, type ParsedCv, type ScoreResult, type Weights } from "./types.ts";
import {
  ParsedCvSchema,
  PARSE_RESPONSE_SCHEMA,
  ScoreResultSchema,
  SCORE_RESPONSE_SCHEMA,
} from "./schemas.ts";
import { computeWeightedTotalFromVerified, readWeights } from "./weights.ts";
import { synthesizeRawText, validateEvidence } from "./evidence.ts";
import {
  buildScoreSystemPrompt,
  buildScoreUserPrompt,
  PARSE_SYSTEM_PROMPT,
  PARSE_USER_PROMPT,
} from "./prompts.ts";
import { getRubricForJob, rubricGuidanceMap } from "./rubric.ts";
import { computeCost } from "./cost.ts";

// ---------- env ----------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const SCORING_INTERNAL_SECRET = Deno.env.get("SCORING_INTERNAL_SECRET")!;

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const PDF_MIME = "application/pdf";

// ---------- main handler ----------
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  // Auth — constant-time compare
  const auth = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${SCORING_INTERNAL_SECRET}`;
  if (!constantTimeEqual(auth, expected)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { candidate_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 1. Pick a queue row — by candidate_id if given, else atomic dequeue
  let queueRow: QueueRow | null = null;

  if (body.candidate_id) {
    queueRow = await pickByCandidate(body.candidate_id);
  } else {
    const { data, error } = await supa.rpc("pick_scoring_job");
    if (error) return jsonResponse({ error: error.message }, 500);
    queueRow = data as QueueRow | null;
  }

  if (!queueRow) {
    return jsonResponse({ status: "idle", message: "no jobs to drain" }, 200);
  }

  // 2. Process
  const start = Date.now();
  try {
    const screeningId = await processJob(queueRow);
    await supa
      .from("scoring_queue")
      .update({
        status: "succeeded",
        completed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", queueRow.id);
    return jsonResponse(
      {
        status: "succeeded",
        candidate_id: queueRow.candidate_id,
        screening_id: screeningId,
        duration_ms: Date.now() - start,
      },
      200,
    );
  } catch (err) {
    const reason = errMessage(err);
    const retriable = isRetriable(err);
    const isQuota = isQuotaError(err);
    await markFailure(queueRow, reason, retriable, isQuota);
    return jsonResponse(
      {
        status: "failed",
        candidate_id: queueRow.candidate_id,
        error: reason,
        retriable,
        duration_ms: Date.now() - start,
      },
      200,
    );
  }
});

// ---------- core processing ----------
interface QueueRow {
  id: string;
  candidate_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  enqueued_at: string;
  started_at: string | null;
  completed_at: string | null;
  next_retry_at: string | null;
  triggered_by: string | null;
}

async function processJob(q: QueueRow): Promise<string> {
  // Fetch candidate
  const { data: candidate, error: cErr } = await supa
    .from("candidates")
    .select("id, job_id, full_name, cv_file_id")
    .eq("id", q.candidate_id)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!candidate) throw new Error("Không tìm thấy ứng viên.");
  if (!candidate.cv_file_id) throw new Error("Ứng viên chưa có CV đính kèm.");

  // Fetch CV file
  const { data: cvFile, error: cvErr } = await supa
    .from("cv_files")
    .select("storage_path, pdf_storage_path, mime, original_name")
    .eq("id", candidate.cv_file_id)
    .maybeSingle();
  if (cvErr) throw cvErr;
  if (!cvFile) throw new Error("Không tìm thấy file CV.");

  // Resolve effective PDF path
  const pdfPath =
    cvFile.pdf_storage_path ?? (cvFile.mime === PDF_MIME ? cvFile.storage_path : null);
  if (!pdfPath)
    throw new NonRetriableError(
      "Cần chuyển đổi DOCX sang PDF (LibreOffice worker chưa kích hoạt).",
    );

  // Download bytes
  const { data: blob, error: dlErr } = await supa.storage.from("cvs").download(pdfPath);
  if (dlErr || !blob) throw new Error(`Không tải được CV: ${dlErr?.message ?? "unknown"}`);
  const pdfBytes = new Uint8Array(await blob.arrayBuffer());

  // Fetch job
  const { data: job, error: jErr } = await supa
    .from("jobs")
    .select("id, title, description, requirements, role_family, location, weights")
    .eq("id", candidate.job_id)
    .maybeSingle();
  if (jErr) throw jErr;
  if (!job) throw new Error("Không tìm thấy tin tuyển dụng.");

  const weights = readWeights(job.weights);
  const { rubric, extraSystemNote } = getRubricForJob(job.role_family, job.title);
  const guidance = rubricGuidanceMap(rubric);

  // Pass 1 — parse CV
  const passOne = await runParse(pdfBytes);

  // Synthesize a raw-text dump (for evidence verification). Gemini's parse
  // doesn't return raw text; we reconstitute from the structured fields.
  passOne.parsed._raw_text = synthesizeRawText(passOne.parsed);

  // Pass 2 — score
  const requirementsHtml =
    typeof job.requirements === "object" && job.requirements && "html" in job.requirements
      ? String((job.requirements as { html?: string }).html ?? "")
      : typeof job.requirements === "string"
        ? job.requirements
        : "";
  const passTwo = await runScore({
    parsedCv: passOne.parsed,
    jobTitle: job.title,
    jobDescription: job.description ?? "",
    jobRequirementsHtml: requirementsHtml,
    jobLocation: job.location ?? null,
    roleFamily: job.role_family,
    weights,
    rubricGuidance: guidance,
    extraSystemNote,
  });

  // Validate evidence quotes
  const verified = validateEvidence(passTwo.scored, passOne.parsed._raw_text);
  const total = computeWeightedTotalFromVerified(verified, weights);

  // Persist ai_screenings — the bump_candidate_score trigger denormalizes onto candidates.
  const tokensIn = (passOne.usage.in ?? 0) + (passTwo.usage.in ?? 0);
  const tokensOut = (passOne.usage.out ?? 0) + (passTwo.usage.out ?? 0);
  const cost = computeCost(GEMINI_MODEL, tokensIn, tokensOut);

  const { data: ins, error: insErr } = await supa
    .from("ai_screenings")
    .insert({
      candidate_id: q.candidate_id,
      model: GEMINI_MODEL,
      pass1_raw: passOne.raw,
      pass2_raw: passTwo.raw,
      criteria: verified,
      weights_snapshot: weights,
      total,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: cost,
      duration_ms: passOne.durationMs + passTwo.durationMs,
      error: null,
    })
    .select("id")
    .single();
  if (insErr || !ins) throw insErr ?? new Error("Không lưu được ai_screenings.");

  // Mirror cv_text + parsed onto candidates (admin client; trigger already wrote ai_score + ai_breakdown + status)
  await supa
    .from("candidates")
    .update({
      cv_text: passOne.parsed._raw_text.slice(0, 50_000),
      parsed: stripRawText(passOne.parsed),
    })
    .eq("id", q.candidate_id);

  return ins.id as string;
}

function stripRawText(p: ParsedCv): Omit<ParsedCv, "_raw_text"> {
  const copy = { ...p } as Partial<ParsedCv>;
  delete copy._raw_text;
  return copy as Omit<ParsedCv, "_raw_text">;
}

// ---------- Gemini calls ----------
async function runParse(
  pdfBytes: Uint8Array,
): Promise<{
  parsed: ParsedCv;
  raw: unknown;
  usage: { in: number; out: number };
  durationMs: number;
}> {
  const start = Date.now();
  const inlineData = { data: encodeBase64(pdfBytes), mimeType: PDF_MIME };
  const resp = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: PARSE_USER_PROMPT }, { inlineData }],
      },
    ],
    config: {
      systemInstruction: PARSE_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: PARSE_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

  const text = (resp as { text?: string }).text ?? "";
  if (!text) throw new Error("Gemini trả về rỗng (parse pass).");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Gemini trả về JSON không hợp lệ (parse pass).");
  }
  const validated = ParsedCvSchema.safeParse(raw);
  if (!validated.success) {
    throw new Error("Schema CV parse không khớp: " + validated.error.issues[0]?.message);
  }
  const usage =
    (resp as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } })
      .usageMetadata ?? {};
  return {
    parsed: { ...validated.data, _raw_text: "" },
    raw,
    usage: { in: usage.promptTokenCount ?? 0, out: usage.candidatesTokenCount ?? 0 },
    durationMs: Date.now() - start,
  };
}

async function runScore(args: {
  parsedCv: ParsedCv;
  jobTitle: string;
  jobDescription: string;
  jobRequirementsHtml: string;
  jobLocation: string | null;
  roleFamily: string;
  weights: Weights;
  rubricGuidance: Record<(typeof CRITERION_CODES)[number], string>;
  extraSystemNote: string;
}): Promise<{
  scored: ScoreResult;
  raw: unknown;
  usage: { in: number; out: number };
  durationMs: number;
}> {
  const start = Date.now();
  const userPrompt = buildScoreUserPrompt({
    jobTitle: args.jobTitle,
    jobDescription: args.jobDescription,
    jobRequirementsHtml: args.jobRequirementsHtml,
    jobLocation: args.jobLocation,
    roleFamily: args.roleFamily,
    weights: args.weights,
    rubricGuidance: args.rubricGuidance,
    parsedCv: args.parsedCv,
    extraSystemNote: args.extraSystemNote,
  });
  const systemPrompt = buildScoreSystemPrompt(args.extraSystemNote);

  const resp = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: SCORE_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });

  const text = (resp as { text?: string }).text ?? "";
  if (!text) throw new Error("Gemini trả về rỗng (score pass).");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Gemini trả về JSON không hợp lệ (score pass).");
  }
  const validated = ScoreResultSchema.safeParse(raw);
  if (!validated.success) {
    throw new Error("Schema score không khớp: " + validated.error.issues[0]?.message);
  }
  const usage =
    (resp as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } })
      .usageMetadata ?? {};
  return {
    scored: validated.data,
    raw,
    usage: { in: usage.promptTokenCount ?? 0, out: usage.candidatesTokenCount ?? 0 },
    durationMs: Date.now() - start,
  };
}

// ---------- queue helpers ----------
async function pickByCandidate(candidateId: string): Promise<QueueRow | null> {
  // Look up the latest queued/failed-with-retry-due row for this candidate, mark running.
  const nowIso = new Date().toISOString();
  const { data: existing } = await supa
    .from("scoring_queue")
    .select("*")
    .eq("candidate_id", candidateId)
    .or(`status.eq.queued,and(status.eq.failed,next_retry_at.lte.${nowIso})`)
    .order("enqueued_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!existing) return null;
  const row = existing as QueueRow;
  await supa
    .from("scoring_queue")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      attempts: row.attempts + 1,
    })
    .eq("id", row.id);
  return {
    ...row,
    status: "running",
    started_at: new Date().toISOString(),
    attempts: row.attempts + 1,
  };
}

async function markFailure(
  q: QueueRow,
  reason: string,
  retriable: boolean,
  isQuota: boolean,
): Promise<void> {
  // Compute next retry
  let nextRetry: string | null = null;
  if (retriable && q.attempts < 3) {
    const delaySec = isQuota ? secondsToNextMidnightUtc7() : 5 * Math.pow(2, q.attempts - 1);
    nextRetry = new Date(Date.now() + delaySec * 1000).toISOString();
  }
  // Mark queue row
  await supa
    .from("scoring_queue")
    .update({
      status: "failed",
      last_error: reason,
      next_retry_at: nextRetry,
      completed_at: nextRetry ? null : new Date().toISOString(),
    })
    .eq("id", q.id);

  // If terminal failure (no further retry), flag candidate for HR manual scoring
  if (!retriable || q.attempts >= 3) {
    await supa
      .from("candidates")
      .update({
        ai_screening_status: "failed",
        ai_screening_error: reason,
      })
      .eq("id", q.candidate_id);
  }
}

function secondsToNextMidnightUtc7(): number {
  // UTC+7 midnight = UTC 17:00 the previous day
  const now = new Date();
  const nextMid = new Date(now);
  nextMid.setUTCHours(17, 0, 0, 0);
  if (nextMid.getTime() <= now.getTime()) nextMid.setUTCDate(nextMid.getUTCDate() + 1);
  return Math.max(60, Math.floor((nextMid.getTime() - now.getTime()) / 1000));
}

// ---------- error classification ----------
class NonRetriableError extends Error {}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isRetriable(err: unknown): boolean {
  if (err instanceof NonRetriableError) return false;
  const msg = errMessage(err).toLowerCase();
  // Retriable: 429, 5xx, network/timeouts. Non-retriable: 4xx (except 429), schema/validation errors, our explicit non-retriable.
  if (msg.includes("schema") || msg.includes("không hợp lệ") || msg.includes("không tìm thấy"))
    return false;
  if (
    msg.includes("rate") ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("timeout")
  )
    return true;
  return false;
}

function isQuotaError(err: unknown): boolean {
  const msg = errMessage(err).toLowerCase();
  return msg.includes("quota") || msg.includes("daily limit") || msg.includes("exhausted");
}

// ---------- utils ----------
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let mismatch = 0;
  for (let i = 0; i < aBytes.length; i++) mismatch |= aBytes[i]! ^ bBytes[i]!;
  return mismatch === 0;
}
