"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { enqueueScoring, recordManualScore, jobWeights } from "@/server/scoring/repository";
import { triggerEdgeFunction } from "@/server/scoring/orchestration";
import { getCandidate } from "@/server/candidates/repository";
import { getJob } from "@/server/jobs/repository";
import { CRITERION_CODES, type CriterionCode } from "@/lib/ai/gemini/types";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Re-enqueue scoring for a candidate. Used by both:
 *   - "Thử lại" button on a failed screening
 *   - "Chấm lại" button on a successful screening (HR wants a fresh AI pass)
 */
export async function triggerScoringAction(candidateId: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  if (!isUuid(candidateId)) return { ok: false, error: "ID không hợp lệ" };
  try {
    await enqueueScoring(candidateId, profile.id);
    triggerEdgeFunction(candidateId);
    revalidatePath(`/ung-vien/${candidateId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không kích hoạt được chấm điểm",
    };
  }
}

const ManualScoreSchema = z.object({
  candidate_id: z.string().uuid(),
  scores: z.object(
    Object.fromEntries(CRITERION_CODES.map((k) => [k, z.number().int().min(0).max(100)])) as Record<
      CriterionCode,
      z.ZodNumber
    >,
  ),
  reasoning: z.string().trim().max(500).optional(),
});

export async function manualScoreAction(input: unknown): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  const parsed = ManualScoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const candidate = await getCandidate(parsed.data.candidate_id);
  if (!candidate) return { ok: false, error: "Không tìm thấy ứng viên" };
  const job = await getJob(candidate.job_id);
  if (!job) return { ok: false, error: "Không tìm thấy tin tuyển dụng" };

  try {
    await recordManualScore({
      candidateId: parsed.data.candidate_id,
      scores: parsed.data.scores as Record<CriterionCode, number>,
      weights: jobWeights(job.weights),
      actorId: profile.id,
      reasoning: parsed.data.reasoning,
    });
    revalidatePath(`/ung-vien/${parsed.data.candidate_id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không lưu được điểm" };
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
