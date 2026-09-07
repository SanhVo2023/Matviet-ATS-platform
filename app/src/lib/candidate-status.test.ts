import { describe, expect, it } from "vitest";
import { deriveCandidateStatus, type StatusInputs, type StatusRelated } from "./candidate-status";

const NOW = Date.parse("2026-09-07T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

function derive(c: Partial<StatusInputs>, related: StatusRelated = {}) {
  return deriveCandidateStatus({ current_stage: "intake", ...c } as StatusInputs, {
    now: NOW,
    ...related,
  });
}

describe("deriveCandidateStatus — intake", () => {
  it("AI pending → waiting on AI", () => {
    const d = derive({ current_stage: "intake", ai_screening_status: "pending" });
    expect(d).toMatchObject({ tone: "waiting", waitingOn: "ai" });
  });
  it("AI failed → blocked on HR", () => {
    const d = derive({ current_stage: "intake", ai_screening_status: "failed" });
    expect(d).toMatchObject({ tone: "blocked", waitingOn: "hr" });
  });
  it("AI success → ready for HR to schedule", () => {
    const d = derive({ current_stage: "intake", ai_screening_status: "success" });
    expect(d).toMatchObject({ tone: "ready", waitingOn: "hr" });
  });
});

describe("deriveCandidateStatus — evaluating", () => {
  const base = { current_stage: "evaluating" as const };
  it("future interview → waiting on candidate", () => {
    const d = derive(base, { nextInterviewAt: daysAgo(-2) });
    expect(d).toMatchObject({ tone: "waiting", waitingOn: "candidate" });
  });
  it("completed interview, no eval → waiting on manager", () => {
    const d = derive(base, { awaitingEvaluation: true });
    expect(d.waitingOn).toBe("manager");
  });
  it("test sent, not submitted → waiting on candidate", () => {
    const d = derive(base, { testAwaitingSubmission: true });
    expect(d.waitingOn).toBe("candidate");
  });
  it("test submitted, not graded → waiting on HR", () => {
    const d = derive(base, { testAwaitingGrade: true });
    expect(d.waitingOn).toBe("hr");
  });
  it("nothing pending → ready", () => {
    expect(derive(base).tone).toBe("ready");
  });
});

describe("deriveCandidateStatus — approving", () => {
  it("routes waiting-on by the pending step", () => {
    expect(
      derive({ current_stage: "approving" }, { pendingApprovalStep: "manager_recommend" })
        .waitingOn,
    ).toBe("manager");
    expect(derive({ current_stage: "approving" }, { pendingApprovalStep: "bod" }).waitingOn).toBe(
      "bod",
    );
    expect(
      derive({ current_stage: "approving" }, { pendingApprovalStep: "tap_doan" }).waitingOn,
    ).toBe("tap_doan");
  });
  it("no pending step is a blocked data-integrity signal", () => {
    expect(derive({ current_stage: "approving" }, { pendingApprovalStep: null }).tone).toBe(
      "blocked",
    );
  });
});

describe("deriveCandidateStatus — offer", () => {
  it("live token, no response → waiting on candidate", () => {
    const d = derive({
      current_stage: "offer",
      offer_token: "tok",
      offer_token_expires_at: daysAgo(-3),
    });
    expect(d.waitingOn).toBe("candidate");
  });
  it("expired token, no response → blocked on HR", () => {
    const d = derive({
      current_stage: "offer",
      offer_token: "tok",
      offer_token_expires_at: daysAgo(1),
    });
    expect(d.tone).toBe("blocked");
  });
  it("no token yet → ready for HR to compose", () => {
    expect(derive({ current_stage: "offer" }).tone).toBe("ready");
  });
});

describe("deriveCandidateStatus — terminals", () => {
  it("offer_accepted awaits HR confirm", () => {
    expect(derive({ current_stage: "offer_accepted" })).toMatchObject({
      tone: "ready",
      waitingOn: "hr",
    });
  });
  it("hired is done with no waiting", () => {
    expect(derive({ current_stage: "hired" })).toMatchObject({ tone: "done", waitingOn: null });
  });
  it("rejected label reflects the reason", () => {
    expect(derive({ current_stage: "rejected", rejection_reason: "offer_declined" }).label).toMatch(
      /offer/i,
    );
    expect(derive({ current_stage: "rejected", rejection_reason: "screened_out" }).label).toMatch(
      /sàng lọc/,
    );
  });
  it("withdrew is done", () => {
    expect(derive({ current_stage: "withdrew" }).tone).toBe("done");
  });
});

describe("daysWaiting", () => {
  it("counts whole days from the last stage change", () => {
    const d = derive(
      { current_stage: "approving" },
      { pendingApprovalStep: "bod", lastStageChangeAt: daysAgo(12) },
    );
    expect(d.daysWaiting).toBe(12);
  });
  it("is 0 for a same-day change", () => {
    const d = derive(
      { current_stage: "approving" },
      { pendingApprovalStep: "bod", lastStageChangeAt: daysAgo(0) },
    );
    expect(d.daysWaiting).toBe(0);
  });
});
