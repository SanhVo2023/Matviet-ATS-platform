import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/vi-format";
import {
  STAGE_GROUPS,
  CLOSED_GROUP,
  groupOfStage,
  stageReadiness,
  type Stage,
  type StageGroup,
} from "@/lib/validation/candidate";
import { scoreVerdict } from "@/lib/stage-visuals";
import { STEP_LABEL_VI } from "@/server/approvals/presets";
import type { CandidateRow, StageHistoryRow } from "@/server/candidates/repository";
import type { JobRow } from "@/server/jobs/repository";
import type { AiScreeningRow } from "@/server/scoring/repository";
import type { AssessmentRow, AssessmentSubmissionRow } from "@/server/assessments/repository";
import type { CandidateEvaluationRow, InterviewRow } from "@/server/interviews/repository";
import type { ApprovalRow } from "@/server/approvals/repository";
import type { Database } from "@/types/db";
import { ScoringTab } from "@/components/features/scoring/ScoringTab";
import { InterviewsTab } from "@/components/features/interviews/InterviewsTab";
import { AssessmentsTab } from "@/components/features/assessments/AssessmentsTab";
import { ApprovalsTab } from "@/components/features/approvals/ApprovalsTab";
import { JourneyRung, ExitBand, type RungState } from "./JourneyRung";
import { EvaluationsSummary, evaluationTally } from "./EvaluationsSummary";
import { RungActions } from "./RungActions";

type Role = Database["public"]["Enums"]["user_role"];

interface Props {
  candidate: CandidateRow;
  job: JobRow | null;
  latestScreening: AiScreeningRow | null;
  queueStatus: {
    status: string;
    attempts: number;
    last_error: string | null;
    enqueued_at: string;
  } | null;
  isAdmin: boolean;
  currentRole: Role;
  interviews: InterviewRow[];
  interviewers: Array<{ id: string; full_name: string | null; role: string }>;
  evaluations: CandidateEvaluationRow[];
  assessment: AssessmentRow | null;
  latestSubmission: AssessmentSubmissionRow | null;
  approvals: ApprovalRow[];
  actorNames: Record<string, string>;
  currentUserOwnsManagerStep: boolean;
  history: StageHistoryRow[];
  /** Server-prepared compose button for the offer email (stage offer_sent). */
  offerComposeSlot?: React.ReactNode;
}

/**
 * The candidate page's spine (ADR 0019): the hiring process rendered as a
 * vertical 4-rung ladder. Passed rungs carry their RESULTS as one-line
 * summaries (expand in place for full detail); the current rung ships open
 * with its content and the stage-driven action bar; future rungs are ghosts.
 * Rejected/withdrew candidates show a "journey ended here" band on the rung
 * where they exited.
 */
export function CandidateJourney(props: Props) {
  const { candidate, history } = props;
  const stage = candidate.current_stage as Stage;
  const canManage = props.currentRole === "admin" || props.currentRole === "hr";

  const isClosed = groupOfStage(stage).id === CLOSED_GROUP.id;
  const exitRow = isClosed
    ? [...history].reverse().find((h) => CLOSED_GROUP.stages.includes(h.to_stage as Stage))
    : undefined;
  // Where the candidate stopped climbing: group of the stage they left from.
  const anchorStage: Stage = isClosed ? ((exitRow?.from_stage as Stage) ?? "new") : stage;
  const anchorIdx = Math.max(
    0,
    STAGE_GROUPS.findIndex((g) => g.id === groupOfStage(anchorStage).id),
  );

  const enteredAt = (group: StageGroup): string | null => {
    if (group.id === "g_intake") return candidate.created_at;
    const first = history.find((h) => group.stages.includes(h.to_stage as Stage));
    return first?.at ?? null;
  };

  const eventsFor = (group: StageGroup) =>
    history.filter((h) => groupOfStage(h.to_stage as Stage).id === group.id);

  const readiness = stageReadiness(stage, candidate.ai_screening_status);

  return (
    <ol aria-label="Hành trình tuyển dụng">
      {STAGE_GROUPS.map((group, i) => {
        const state: RungState = isClosed
          ? i < anchorIdx
            ? "done"
            : i === anchorIdx
              ? "done"
              : "todo"
          : i < anchorIdx
            ? "done"
            : i === anchorIdx
              ? "current"
              : "todo";
        const isExitRung = isClosed && i === anchorIdx;
        const entered = enteredAt(group);

        return (
          <JourneyRung
            key={group.id}
            icon={group.icon}
            title={group.label}
            state={state}
            meta={state !== "todo" && entered ? formatDate(entered) : null}
            readiness={state === "current" ? readiness : null}
            summary={state !== "todo" ? rungSummary(group.id, props) : null}
            ghostText={group.description}
            last={i === STAGE_GROUPS.length - 1}
            defaultOpen={state === "current"}
            exitBand={
              isExitRung ? (
                <ExitBand
                  tone={stage === "rejected" ? "rejected" : "withdrew"}
                  label={`Kết thúc tại đây — ${t.stage[stage]}${exitRow ? ` · ${formatDate(exitRow.at)}` : ""}`}
                />
              ) : undefined
            }
            actionsSlot={
              state === "current" && !isClosed ? (
                <RungActions
                  candidateId={candidate.id}
                  candidateName={candidate.full_name}
                  stage={stage}
                  role={props.currentRole}
                  interviewers={props.interviewers}
                />
              ) : undefined
            }
          >
            {state !== "todo" ? (
              <>
                {rungContent(group.id, props, canManage)}
                <RungEvents rows={eventsFor(group)} actorNames={props.actorNames} />
              </>
            ) : null}
          </JourneyRung>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Per-rung summaries — the one-line "what happened here"
// ---------------------------------------------------------------------------

function rungSummary(groupId: string, props: Props): React.ReactNode {
  const { candidate, evaluations, latestSubmission, approvals, interviews } = props;

  if (groupId === "g_intake") {
    if (candidate.ai_score != null) {
      const v = scoreVerdict(candidate.ai_score);
      return (
        <span>
          <span className="font-bold tabular-nums text-brand-900">
            {Math.round(candidate.ai_score)}
          </span>
          <span
            className={cn("ml-1.5 rounded-full px-2 py-0.5 text-xs font-semibold", v.className)}
          >
            {v.label}
          </span>
          <span className="ml-1.5 text-xs text-slate-400">Nguồn: {t.source[candidate.source]}</span>
        </span>
      );
    }
    if (candidate.ai_screening_status === "failed") return "Chấm AI thất bại — cần xử lý";
    return "AI đang chấm điểm…";
  }

  if (groupId === "g_eval") {
    const parts: string[] = [];
    const tally = evaluationTally(evaluations);
    if (tally.total > 0) parts.push(`PV: ${tally.positive}/${tally.total} đề xuất tuyển`);
    else {
      const next = interviews.find((iv) => iv.status === "scheduled");
      if (next) parts.push(`PV ${formatDateTime(next.scheduled_at)}`);
    }
    if (latestSubmission?.score != null) parts.push(`Test: ${latestSubmission.score}`);
    else if (latestSubmission) parts.push("Test: chờ chấm");
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  if (groupId === "g_offer") {
    const total = approvals.length;
    if (total > 0) {
      const approved = approvals.filter((a) => a.status === "approved").length;
      const rejected = approvals.some((a) => a.status === "rejected");
      const pending = approvals.find((a) => a.status === "pending");
      if (rejected) return "Đề xuất bị từ chối ở bước duyệt";
      if (approved === total) {
        return candidate.offer_response === "accepted"
          ? `Duyệt xong ${approved}/${total} · Offer đã được nhận`
          : `Duyệt xong ${approved}/${total} · ${candidate.current_stage === "offer_sent" ? "Chờ ứng viên phản hồi offer" : "Sẵn sàng gửi offer"}`;
      }
      return `Duyệt ${approved}/${total} bước — ${pending ? STEP_LABEL_VI[pending.step_kind] : "đang xử lý"}`;
    }
    return null;
  }

  // g_onboard
  if (candidate.current_stage === "hired") {
    return `Đã tuyển 🎉${candidate.expected_start_date ? ` · Bắt đầu ${formatDate(candidate.expected_start_date)}` : ""}`;
  }
  if (candidate.offer_response === "accepted") {
    return `Nhận việc ${candidate.offer_responded_at ? formatDate(candidate.offer_responded_at) : ""}${candidate.expected_start_date ? ` · Bắt đầu ${formatDate(candidate.expected_start_date)}` : ""}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Per-rung expanded content
// ---------------------------------------------------------------------------

function rungContent(groupId: string, props: Props, canManage: boolean): React.ReactNode {
  const { candidate } = props;

  if (groupId === "g_intake") {
    return (
      <ScoringTab
        candidate={candidate}
        job={props.job}
        latestScreening={props.latestScreening}
        queueStatus={props.queueStatus}
        isAdmin={props.isAdmin}
      />
    );
  }

  if (groupId === "g_eval") {
    return (
      <>
        <InterviewsTab
          candidateId={candidate.id}
          candidateName={candidate.full_name}
          interviews={props.interviews}
          interviewers={props.interviewers}
          canSchedule={false}
        />
        <EvaluationsSummary evaluations={props.evaluations} names={props.actorNames} />
        <AssessmentsTab
          candidateId={candidate.id}
          candidateName={candidate.full_name}
          assessment={props.assessment}
          submission={props.latestSubmission}
          canSend={canManage}
        />
      </>
    );
  }

  if (groupId === "g_offer") {
    const total = props.approvals.length;
    const approved = props.approvals.filter((a) => a.status === "approved").length;
    const rejected = props.approvals.some((a) => a.status === "rejected");
    const pct = total === 0 ? 0 : Math.round((approved / total) * 100);
    return (
      <>
        {total > 0 ? (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                rejected ? "bg-rose-400" : pct === 100 ? "bg-emerald-500" : "bg-accent-400",
              )}
              style={{ width: `${rejected ? 100 : Math.max(pct, 6)}%` }}
            />
          </div>
        ) : null}
        <ApprovalsTab
          candidateId={candidate.id}
          approvals={props.approvals}
          currentRole={props.currentRole}
          currentUserOwnsManagerStep={props.currentUserOwnsManagerStep}
          actorNames={props.actorNames}
          canStart={canManage || props.currentRole === "hiring_manager"}
        />
        <OfferBlock candidate={candidate} composeSlot={canManage ? props.offerComposeSlot : null} />
      </>
    );
  }

  // g_onboard
  return <OnboardBlock candidate={candidate} />;
}

/** Offer status inside rung 3 — magic-link state + the compose button. */
function OfferBlock({
  candidate,
  composeSlot,
}: {
  candidate: CandidateRow;
  composeSlot?: React.ReactNode;
}) {
  const stage = candidate.current_stage;
  const relevant =
    stage === "offer_sent" || candidate.offer_response != null || candidate.offer_token != null;
  if (!relevant) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Thư mời (Offer)
      </p>
      {candidate.offer_response === "accepted" ? (
        <p className="mt-1 text-emerald-700">
          ✓ Ứng viên đã nhận offer
          {candidate.offer_responded_at ? ` — ${formatDateTime(candidate.offer_responded_at)}` : ""}
        </p>
      ) : candidate.offer_response === "declined" ? (
        <p className="mt-1 text-rose-600">
          ✕ Ứng viên từ chối offer
          {candidate.offer_responded_at ? ` — ${formatDateTime(candidate.offer_responded_at)}` : ""}
          {candidate.offer_response_note ? ` · "${candidate.offer_response_note}"` : ""}
        </p>
      ) : stage === "offer_sent" ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-slate-600">
            Duyệt xong — soạn thư mời nhận việc (link chấp nhận tự chèn vào mẫu Offer).
          </p>
          {composeSlot}
        </div>
      ) : null}
    </div>
  );
}

/** Rung 4 content — acceptance + start date. */
function OnboardBlock({ candidate }: { candidate: CandidateRow }) {
  return (
    <div className="space-y-1 text-sm text-slate-600">
      {candidate.offer_responded_at ? (
        <p>
          Chấp nhận offer: <strong>{formatDateTime(candidate.offer_responded_at)}</strong>
        </p>
      ) : null}
      {candidate.expected_start_date ? (
        <p>
          Ngày bắt đầu dự kiến: <strong>{formatDate(candidate.expected_start_date)}</strong>
        </p>
      ) : null}
      {candidate.offer_response_note ? (
        <p className="text-xs text-slate-500">
          Ghi chú của ứng viên: {candidate.offer_response_note}
        </p>
      ) : null}
      {candidate.current_stage === "hired" ? (
        <p className="font-medium text-emerald-700">Đã tuyển — hoàn tất hành trình. 🎉</p>
      ) : null}
    </div>
  );
}

/** Compact per-rung event history (replaces the old right-rail timeline). */
function RungEvents({
  rows,
  actorNames,
}: {
  rows: StageHistoryRow[];
  actorNames: Record<string, string>;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Diễn biến
      </p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.id} className="text-xs text-slate-500">
            <span className="tabular-nums text-slate-400">{formatDateTime(r.at)}</span>
            {" — "}
            {r.from_stage ? `${t.stage[r.from_stage]} → ` : ""}
            <span className="font-medium text-slate-600">{t.stage[r.to_stage]}</span>
            {r.actor_user_id ? ` · ${actorNames[r.actor_user_id] ?? "Hệ thống"}` : " · Hệ thống"}
            {r.notes ? ` · ${r.notes}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
