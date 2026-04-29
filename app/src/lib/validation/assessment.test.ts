import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_TOKEN_EXPIRY_MS,
  CreateAssessmentSchema,
  GradeSubmissionSchema,
  SendAssessmentSchema,
  isAcceptedAssessmentMime,
} from "./assessment";

describe("CreateAssessmentSchema", () => {
  it("accepts minimum valid input", () => {
    const r = CreateAssessmentSchema.safeParse({
      job_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(r.success).toBe(true);
  });

  it("rejects bad UUID", () => {
    const r = CreateAssessmentSchema.safeParse({ job_id: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("clamps time_limit_min upper bound", () => {
    const r = CreateAssessmentSchema.safeParse({
      job_id: "11111111-1111-1111-1111-111111111111",
      time_limit_min: 1000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative time_limit", () => {
    const r = CreateAssessmentSchema.safeParse({
      job_id: "11111111-1111-1111-1111-111111111111",
      time_limit_min: -10,
    });
    expect(r.success).toBe(false);
  });
});

describe("GradeSubmissionSchema", () => {
  it("accepts boundary scores 0 and 100", () => {
    expect(
      GradeSubmissionSchema.safeParse({
        submission_id: "11111111-1111-1111-1111-111111111111",
        score: 0,
      }).success,
    ).toBe(true);
    expect(
      GradeSubmissionSchema.safeParse({
        submission_id: "11111111-1111-1111-1111-111111111111",
        score: 100,
      }).success,
    ).toBe(true);
  });

  it("rejects scores outside 0–100", () => {
    expect(
      GradeSubmissionSchema.safeParse({
        submission_id: "11111111-1111-1111-1111-111111111111",
        score: -1,
      }).success,
    ).toBe(false);
    expect(
      GradeSubmissionSchema.safeParse({
        submission_id: "11111111-1111-1111-1111-111111111111",
        score: 101,
      }).success,
    ).toBe(false);
  });
});

describe("SendAssessmentSchema", () => {
  it("requires both UUIDs", () => {
    expect(
      SendAssessmentSchema.safeParse({
        candidate_id: "11111111-1111-1111-1111-111111111111",
      }).success,
    ).toBe(false);
  });
});

describe("isAcceptedAssessmentMime", () => {
  it("accepts only PDF", () => {
    expect(isAcceptedAssessmentMime("application/pdf")).toBe(true);
    expect(isAcceptedAssessmentMime("image/png")).toBe(false);
    expect(
      isAcceptedAssessmentMime(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(false);
  });
});

describe("ASSESSMENT_TOKEN_EXPIRY_MS", () => {
  it("is exactly 48 hours", () => {
    expect(ASSESSMENT_TOKEN_EXPIRY_MS).toBe(48 * 60 * 60 * 1000);
  });
});
