import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { interviews, interview_attendees, interview_evaluations, candidates } from "@/db/schema";
import type { ScheduleInterviewInput, SubmitEvaluationInput } from "@/lib/validation/interview";

/**
 * Schedule a new interview.
 *
 * Steps:
 *  1. Resolve job_id from the candidate.
 *  2. Insert interviews row.
 *  3. Insert interview_attendees rows (one per attendee_id).
 *  4. Bump candidate.current_stage to 'interview_scheduled' if it's an earlier stage.
 *
 * MS Graph integration deferred to G7 — graph_event_id and teams_link stay null.
 */
export async function scheduleInterview(
  input: ScheduleInterviewInput,
  createdBy: string,
): Promise<{ id: string }> {
  const db = await getDb();

  const candidate = await db
    .select({
      id: candidates.id,
      job_id: candidates.job_id,
      current_stage: candidates.current_stage,
    })
    .from(candidates)
    .where(eq(candidates.id, input.candidate_id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!candidate) throw new Error("Không tìm thấy ứng viên");

  // 1. Insert interview
  const ins = await db
    .insert(interviews)
    .values({
      candidate_id: candidate.id,
      job_id: candidate.job_id,
      scheduled_at: input.scheduled_at,
      duration_min: input.duration_min,
      type: input.type,
      location_or_link: input.location_or_link?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: createdBy,
      status: "scheduled",
    })
    .returning({ id: interviews.id })
    .then((r) => r[0] ?? null);
  if (!ins) throw new Error("Không tạo được lịch phỏng vấn");
  const interviewId = ins.id;

  // 2. Insert attendees
  const attendeeRows = input.attendee_ids.map((uid) => ({
    interview_id: interviewId,
    user_id: uid,
    role: "interviewer" as const,
  }));
  try {
    if (attendeeRows.length > 0) {
      await db.insert(interview_attendees).values(attendeeRows);
    }
  } catch (err) {
    // Best-effort rollback
    await db
      .delete(interviews)
      .where(eq(interviews.id, interviewId))
      .catch(() => {});
    throw err;
  }

  // 3. Bump candidate stage (only forward — never roll back)
  if (["new", "screening", "screened"].includes(candidate.current_stage)) {
    await db
      .update(candidates)
      .set({ current_stage: "interview_scheduled" })
      .where(eq(candidates.id, candidate.id));
  }

  return { id: interviewId };
}

export async function cancelInterview(interviewId: string, reason?: string): Promise<void> {
  const db = await getDb();
  await db
    .update(interviews)
    .set({ status: "cancelled", notes: reason ?? null })
    .where(eq(interviews.id, interviewId));
}

/**
 * Record (or update) a single reviewer's evaluation. The interview's overall
 * `status` flips to 'completed' once any reviewer submits (HR can manually
 * mark no_show / cancelled separately if needed).
 */
export async function submitEvaluation(
  input: SubmitEvaluationInput,
  evaluatorId: string,
): Promise<{ id: string }> {
  const db = await getDb();

  const payload = {
    scores: input.scores,
    strengths: input.strengths?.trim() || null,
    concerns: input.concerns?.trim() || null,
    proposed_salary: input.proposed_salary ?? null,
    recommendation: input.recommendation,
    internal_notes: input.internal_notes?.trim() || null,
  };

  // Upsert on (interview_id, evaluator_user_id) — one evaluation per reviewer.
  const row = await db
    .insert(interview_evaluations)
    .values({
      interview_id: input.interview_id,
      evaluator_user_id: evaluatorId,
      ...payload,
    })
    .onConflictDoUpdate({
      target: [interview_evaluations.interview_id, interview_evaluations.evaluator_user_id],
      set: { ...payload, updated_at: new Date().toISOString() },
    })
    .returning({ id: interview_evaluations.id })
    .then((r) => r[0] ?? null);
  if (!row) throw new Error("Không lưu được đánh giá");
  const evalId = row.id;

  // Mark interview completed + bump candidate stage if currently before 'interviewed'
  await db
    .update(interviews)
    .set({ status: "completed" })
    .where(and(eq(interviews.id, input.interview_id), ne(interviews.status, "completed")));

  const iv = await db
    .select({ candidate_id: interviews.candidate_id })
    .from(interviews)
    .where(eq(interviews.id, input.interview_id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (iv) {
    const cid = iv.candidate_id;
    const cand = await db
      .select({ current_stage: candidates.current_stage })
      .from(candidates)
      .where(eq(candidates.id, cid))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (cand) {
      const stage = String(cand.current_stage);
      if (["new", "screening", "screened", "interview_scheduled"].includes(stage)) {
        await db
          .update(candidates)
          .set({ current_stage: "interviewed" })
          .where(eq(candidates.id, cid));
      }
    }
  }

  return { id: evalId };
}
