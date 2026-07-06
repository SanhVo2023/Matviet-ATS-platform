import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { departments, users } from "@/db/schema";
import { getCandidate } from "@/server/candidates/repository";
import { getJob } from "@/server/jobs/repository";
import { listInterviews, listAttendees } from "@/server/interviews/repository";
import { getAssessmentForJob } from "@/server/assessments/repository";
import { formatVND } from "@/lib/vi-format";

/**
 * Template-variable auto-resolution (ADR 0015 — "HR confirms, AI types").
 * The composer used to make HR hand-type up to 7 values that the system
 * already knows. This resolver derives every var it can from the candidate,
 * job, next interview and assessment; the dialog collapses resolved vars to
 * a summary line. Only non-empty strings are returned — anything missing
 * stays a manual input.
 */
export async function getComposerVarDefaults(
  candidateId: string,
  hrName: string,
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {};
  try {
    const candidate = await getCandidate(candidateId);
    if (!candidate) return vars;
    const db = await getDb();

    vars.candidate_name = candidate.full_name;
    vars.hr_name = hrName;
    vars.company_name = "Mắt Việt";
    if (candidate.expected_start_date) vars.start_date = toVnDate(candidate.expected_start_date);

    const [job, upcoming, assessment] = await Promise.all([
      getJob(candidate.job_id),
      listInterviews({ candidate_id: candidateId, status: "scheduled", upcoming_only: true }),
      getAssessmentForJob(candidate.job_id),
    ]);

    if (job) {
      vars.job_title = job.title;
      if (job.department_id) {
        const dept = await db
          .select({ name: departments.name })
          .from(departments)
          .where(eq(departments.id, job.department_id))
          .get();
        if (dept?.name) vars.department = dept.name;
      }
      if (job.salary_min || job.salary_max) {
        vars.salary =
          job.salary_min && job.salary_max
            ? `${formatVND(job.salary_min)} – ${formatVND(job.salary_max)}`
            : formatVND(job.salary_min ?? job.salary_max);
      }
    }

    const next = upcoming[0];
    if (next) {
      vars.interview_time = toVnDateTime(next.scheduled_at);
      if (next.location_or_link) vars.interview_location = next.location_or_link;
      const attendees = await listAttendees(next.id);
      const ids = attendees.map((a) => a.user_id).filter((v): v is string => !!v);
      if (ids.length) {
        const names = await db
          .select({ name: users.name })
          .from(users)
          .where(inArray(users.id, ids));
        const joined = names
          .map((n) => n.name)
          .filter(Boolean)
          .join(", ");
        if (joined) vars.interviewers = joined;
      }
    }

    if (assessment?.time_limit_min) vars.time_limit = `${assessment.time_limit_min} phút`;

    // Response deadline default: one week out — HR edits if the offer says otherwise.
    vars.deadline = toVnDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
  } catch (err) {
    console.warn("[composer-defaults] resolution failed (composer stays manual):", err);
  }
  // Drop empty strings so the dialog treats them as manual inputs.
  return Object.fromEntries(Object.entries(vars).filter(([, v]) => v && v.trim()));
}

function toVnDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function toVnDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
