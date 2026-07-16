import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  interviews,
  interview_attendees,
  interview_evaluations,
  candidates,
  jobs,
  users,
} from "@/db/schema";
import type { ScheduleInterviewInput, SubmitEvaluationInput } from "@/lib/validation/interview";
import {
  createCalendarEvent,
  cancelCalendarEvent,
  type CalendarAttendee,
} from "@/lib/graph/calendar";
import { publicEnv } from "@/types/env";
import { notifyUsers } from "@/server/notifications/service";
import { emitAgentEventInBackground } from "@/server/agent-flows/events";
import { formatDateTime } from "@/lib/vi-format";

/**
 * Schedule a new interview (G7-complete).
 *
 * Steps:
 *  1. Resolve job_id from the candidate.
 *  2. Insert interviews row.
 *  3. Insert interview_attendees rows (one per attendee_id).
 *  4. Bump candidate.current_stage to 'interview_scheduled' if it's an earlier stage.
 *  5. Best-effort: create the Outlook event (Teams link for video interviews) and
 *     persist graph_event_id + teams_link. Graph being down never blocks the
 *     schedule — the interview simply has no Outlook invite (visible in UI as
 *     a missing Teams/link chip) and HR can re-schedule to retry.
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
      full_name: candidates.full_name,
      email: candidates.email,
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

  // 4. Outlook event + Teams link (best-effort, G7)
  try {
    const job = await db
      .select({ title: jobs.title })
      .from(jobs)
      .where(eq(jobs.id, candidate.job_id))
      .get();

    const interviewerRows = input.attendee_ids.length
      ? await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(inArray(users.id, input.attendee_ids))
      : [];

    const attendees: CalendarAttendee[] = interviewerRows.map((u) => ({
      email: u.email,
      name: u.name,
      type: "required",
    }));
    if (candidate.email) {
      attendees.push({ email: candidate.email, name: candidate.full_name, type: "required" });
    }

    const typeLabel =
      input.type === "video"
        ? "Online (Teams)"
        : input.type === "phone"
          ? "Điện thoại"
          : "Trực tiếp";
    const event = await createCalendarEvent({
      subject: `Phỏng vấn: ${candidate.full_name} — ${job?.title ?? "Mắt Việt"}`,
      bodyHtml: `
        <p><strong>Ứng viên:</strong> ${candidate.full_name}</p>
        <p><strong>Vị trí:</strong> ${job?.title ?? "—"}</p>
        <p><strong>Hình thức:</strong> ${typeLabel}</p>
        ${input.location_or_link ? `<p><strong>Địa điểm/Link:</strong> ${input.location_or_link}</p>` : ""}
        ${input.notes ? `<p><strong>Ghi chú:</strong> ${input.notes}</p>` : ""}
        <p><a href="${publicEnv.appUrl}/phong-van/${interviewId}">Xem chi tiết trong Mắt Việt HR</a></p>`,
      startIso: input.scheduled_at,
      durationMin: input.duration_min,
      attendees,
      isOnline: input.type === "video",
      location: input.type === "in_person" ? (input.location_or_link?.trim() ?? null) : null,
    });

    await db
      .update(interviews)
      .set({
        graph_event_id: event.eventId,
        teams_link: event.teamsJoinUrl,
        // For video interviews with no manual link, surface the Teams link.
        ...(input.type === "video" && !input.location_or_link?.trim() && event.teamsJoinUrl
          ? { location_or_link: event.teamsJoinUrl }
          : {}),
      })
      .where(eq(interviews.id, interviewId));
  } catch (err) {
    console.warn("[interviews] Outlook event creation failed (interview kept):", err);
  }

  // 5. Bell + push for the interviewers (the scheduler already knows)
  await notifyUsers(
    input.attendee_ids,
    {
      type: "interview_created",
      title: `Lịch phỏng vấn mới: ${candidate.full_name}`,
      body: `${formatDateTime(input.scheduled_at)} · ${input.duration_min} phút`,
      link: "/phong-van",
    },
    { excludeUserId: createdBy },
  );

  return { id: interviewId };
}

export async function cancelInterview(interviewId: string, reason?: string): Promise<void> {
  const db = await getDb();
  const existing = await db
    .select({ graph_event_id: interviews.graph_event_id })
    .from(interviews)
    .where(eq(interviews.id, interviewId))
    .get();

  await db
    .update(interviews)
    .set({ status: "cancelled", notes: reason ?? null })
    .where(eq(interviews.id, interviewId));

  // Best-effort Outlook cancellation — attendees get the standard notice.
  if (existing?.graph_event_id) {
    try {
      await cancelCalendarEvent(existing.graph_event_id, reason);
    } catch (err) {
      console.warn("[interviews] Outlook event cancellation failed:", err);
    }
  }
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
    // Agent-driven hiring (ADR 0020): evaluation in → prepared "trình duyệt"
    // proposal with the eval digest. Off the request path.
    emitAgentEventInBackground({ type: "evaluation_submitted", candidateId: cid });
  }

  return { id: evalId };
}
