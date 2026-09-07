import { describe, expect, it } from "vitest";
import {
  PIPELINE_STAGES,
  REJECTION_REASONS,
  ALLOWED_TRANSITIONS,
  TERMINAL_STAGES,
  LEGACY_STAGE_MAP,
  isValidTransition,
  allowedNextStages,
  normalizeStage,
  type Stage,
} from "./stages";

describe("stage enum", () => {
  it("has exactly the 8 collapsed stages", () => {
    expect(PIPELINE_STAGES).toEqual([
      "intake",
      "evaluating",
      "approving",
      "offer",
      "offer_accepted",
      "hired",
      "rejected",
      "withdrew",
    ]);
  });
});

describe("ALLOWED_TRANSITIONS", () => {
  it("has an entry for every stage", () => {
    for (const s of PIPELINE_STAGES) expect(ALLOWED_TRANSITIONS[s]).toBeDefined();
  });

  it("never allows a self-transition", () => {
    for (const s of PIPELINE_STAGES) expect(ALLOWED_TRANSITIONS[s]).not.toContain(s);
  });

  it("terminals have no outgoing transitions", () => {
    for (const s of TERMINAL_STAGES) expect(ALLOWED_TRANSITIONS[s]).toHaveLength(0);
  });

  it("only targets valid stages", () => {
    for (const s of PIPELINE_STAGES)
      for (const to of ALLOWED_TRANSITIONS[s]) expect(PIPELINE_STAGES).toContain(to);
  });

  it("rejected + withdrew reachable from every open pre-hire stage", () => {
    // `hired` is quasi-terminal: only withdrew (a hire reversal), never
    // rejected. The true terminals have no outgoing edges at all.
    const openPreHire: Stage[] = ["intake", "evaluating", "approving", "offer", "offer_accepted"];
    for (const s of openPreHire) {
      expect(ALLOWED_TRANSITIONS[s]).toContain("rejected");
      expect(ALLOWED_TRANSITIONS[s]).toContain("withdrew");
    }
    expect(ALLOWED_TRANSITIONS.hired).toEqual(["withdrew"]);
  });

  it("guards the canonical forward path", () => {
    expect(isValidTransition("intake", "evaluating")).toBe(true);
    expect(isValidTransition("evaluating", "approving")).toBe(true);
    expect(isValidTransition("approving", "offer")).toBe(true);
    expect(isValidTransition("offer", "offer_accepted")).toBe(true);
    expect(isValidTransition("offer_accepted", "hired")).toBe(true);
  });

  it("blocks illegal jumps", () => {
    expect(isValidTransition("intake", "offer")).toBe(false);
    expect(isValidTransition("intake", "hired")).toBe(false);
    expect(isValidTransition("hired", "intake")).toBe(false);
    expect(isValidTransition("rejected", "intake")).toBe(false);
  });

  it("allows leaving approving back to evaluating (chain-cancel correction)", () => {
    expect(isValidTransition("approving", "evaluating")).toBe(true);
  });

  it("allowedNextStages returns a fresh array copy", () => {
    const a = allowedNextStages("intake");
    a.push("hired" as Stage);
    expect(allowedNextStages("intake")).not.toContain("hired");
  });
});

describe("LEGACY_STAGE_MAP", () => {
  it("covers all 16 old stage values", () => {
    const old = [
      "new",
      "screening",
      "screened",
      "interview_scheduled",
      "interviewed",
      "test_sent",
      "test_done",
      "recommended",
      "salary_deal",
      "bod_review",
      "tap_doan_review",
      "offer_sent",
      "offer_accepted",
      "hired",
      "rejected",
      "withdrew",
    ];
    for (const o of old) expect(LEGACY_STAGE_MAP[o]).toBeDefined();
  });

  it("maps only into the new enum", () => {
    for (const v of Object.values(LEGACY_STAGE_MAP)) expect(PIPELINE_STAGES).toContain(v);
  });

  it("keeps terminals as fixed points", () => {
    expect(LEGACY_STAGE_MAP.hired).toBe("hired");
    expect(LEGACY_STAGE_MAP.rejected).toBe("rejected");
    expect(LEGACY_STAGE_MAP.withdrew).toBe("withdrew");
    expect(LEGACY_STAGE_MAP.offer_accepted).toBe("offer_accepted");
  });

  it("collapses the four micro-groups correctly", () => {
    expect(LEGACY_STAGE_MAP.new).toBe("intake");
    expect(LEGACY_STAGE_MAP.screened).toBe("intake");
    expect(LEGACY_STAGE_MAP.interview_scheduled).toBe("evaluating");
    expect(LEGACY_STAGE_MAP.test_done).toBe("evaluating");
    expect(LEGACY_STAGE_MAP.recommended).toBe("approving");
    expect(LEGACY_STAGE_MAP.tap_doan_review).toBe("approving");
    expect(LEGACY_STAGE_MAP.offer_sent).toBe("offer");
  });

  it("normalizeStage passes through new values and maps old ones", () => {
    expect(normalizeStage("intake")).toBe("intake");
    expect(normalizeStage("screened")).toBe("intake");
    expect(normalizeStage("bod_review")).toBe("approving");
  });
});

describe("REJECTION_REASONS", () => {
  it("has the 5 distinct reasons", () => {
    expect(REJECTION_REASONS).toEqual([
      "screened_out",
      "not_approved",
      "offer_declined",
      "withdrawn_by_us",
      "other",
    ]);
  });
});
