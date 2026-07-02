import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert, TablesUpdate } from "@/types/db";
import type { ScheduleInterviewInput, SubmitEvaluationInput } from "@/lib/validation/interview";

type InterviewInsert = TablesInsert<"interviews">;
type InterviewUpdate = TablesUpdate<"interviews">;
type AttendeeInsert = TablesInsert<"interview_attendees">;
type EvaluationInsert = TablesInsert<"interview_evaluations">;
type EvaluationUpdate = TablesUpdate<"interview_evaluations">;
type CandidateUpdate = TablesUpdate<"candidates">;

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
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: candidateRaw, error: cErr } = await supabase
    .from("candidates")
    .select("id, job_id, current_stage")
    .eq("id", input.candidate_id)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!candidateRaw) throw new Error("Không tìm thấy ứng viên");
  const candidate = candidateRaw as { id: string; job_id: string; current_stage: string };

  // 1. Insert interview
  const insertPayload: InterviewInsert = {
    candidate_id: candidate.id,
    job_id: candidate.job_id,
    scheduled_at: input.scheduled_at,
    duration_min: input.duration_min,
    type: input.type,
    location_or_link: input.location_or_link?.trim() || null,
    notes: input.notes?.trim() || null,
    created_by: createdBy,
    status: "scheduled",
  };
  const { data: ins, error: iErr } = await supabase
    .from("interviews")
    .insert(insertPayload as never)
    .select("id")
    .single();
  if (iErr || !ins) throw iErr ?? new Error("Không tạo được lịch phỏng vấn");
  const interviewId = (ins as { id: string }).id;

  // 2. Insert attendees (admin client — interview_attendees RLS allows HR write but admin is faster + tolerant)
  const attendeeRows: AttendeeInsert[] = input.attendee_ids.map((uid) => ({
    interview_id: interviewId,
    user_id: uid,
    role: "interviewer",
  }));
  const { error: aErr } = await admin.from("interview_attendees").insert(attendeeRows as never);
  if (aErr) {
    // Best-effort rollback
    await supabase.from("interviews").delete().eq("id", interviewId);
    throw aErr;
  }

  // 3. Bump candidate stage (only forward — never roll back)
  if (["new", "screening", "screened"].includes(candidate.current_stage)) {
    const candUpdate: CandidateUpdate = { current_stage: "interview_scheduled" };
    await supabase
      .from("candidates")
      .update(candUpdate as never)
      .eq("id", candidate.id);
  }

  return { id: interviewId };
}

export async function cancelInterview(interviewId: string, reason?: string): Promise<void> {
  const supabase = await createClient();
  const update: InterviewUpdate = {
    status: "cancelled",
    notes: reason ?? null,
  };
  const { error } = await supabase
    .from("interviews")
    .update(update as never)
    .eq("id", interviewId);
  if (error) throw error;
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
  const supabase = await createClient();

  // Check if this evaluator already submitted — if so, update, else insert.
  const { data: existing } = await supabase
    .from("interview_evaluations")
    .select("id")
    .eq("interview_id", input.interview_id)
    .eq("evaluator_user_id", evaluatorId)
    .maybeSingle();

  const payload = {
    interview_id: input.interview_id,
    evaluator_user_id: evaluatorId,
    scores: input.scores,
    strengths: input.strengths?.trim() || null,
    concerns: input.concerns?.trim() || null,
    proposed_salary: input.proposed_salary ?? null,
    recommendation: input.recommendation,
    internal_notes: input.internal_notes?.trim() || null,
  };

  let evalId: string;
  if (existing) {
    const updatePayload: EvaluationUpdate = payload;
    const { error } = await supabase
      .from("interview_evaluations")
      .update(updatePayload as never)
      .eq("id", (existing as { id: string }).id);
    if (error) throw error;
    evalId = (existing as { id: string }).id;
  } else {
    const insertPayload: EvaluationInsert = payload;
    const { data: ins, error } = await supabase
      .from("interview_evaluations")
      .insert(insertPayload as never)
      .select("id")
      .single();
    if (error || !ins) throw error ?? new Error("Không lưu được đánh giá");
    evalId = (ins as { id: string }).id;
  }

  // Mark interview completed + bump candidate stage if currently before 'interviewed'
  const interviewUpdate: InterviewUpdate = { status: "completed" };
  await supabase
    .from("interviews")
    .update(interviewUpdate as never)
    .eq("id", input.interview_id)
    .neq("status", "completed");

  const { data: iv } = await supabase
    .from("interviews")
    .select("candidate_id")
    .eq("id", input.interview_id)
    .maybeSingle();
  if (iv) {
    const cid = (iv as { candidate_id: string }).candidate_id;
    const { data: cand } = await supabase
      .from("candidates")
      .select("current_stage")
      .eq("id", cid)
      .maybeSingle();
    if (cand) {
      const stage = String((cand as { current_stage: string }).current_stage);
      if (["new", "screening", "screened", "interview_scheduled"].includes(stage)) {
        const candUpdate: CandidateUpdate = { current_stage: "interviewed" };
        await supabase
          .from("candidates")
          .update(candUpdate as never)
          .eq("id", cid);
      }
    }
  }

  return { id: evalId };
}
