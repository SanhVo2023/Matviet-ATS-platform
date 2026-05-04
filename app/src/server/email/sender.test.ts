import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/graph/email", () => {
  class SendMailError extends Error {
    kind: string;
    statusCode?: number;
    retryAfterSec?: number;
    constructor(
      kind: string,
      message: string,
      options?: { statusCode?: number; retryAfterSec?: number },
    ) {
      super(message);
      this.kind = kind;
      this.statusCode = options?.statusCode;
      this.retryAfterSec = options?.retryAfterSec;
    }
  }
  return {
    sendMail: vi.fn(),
    SendMailError,
  };
});

vi.mock("./repository", () => ({
  listDrainableEmails: vi.fn(),
  markSent: vi.fn(),
  markFailed: vi.fn(),
  bumpRetry: vi.fn(),
}));

import { sendMail, SendMailError } from "@/lib/graph/email";
import { sendOne, drainQueue, SEND_MAX_ATTEMPTS } from "./sender";
import * as repo from "./repository";

const baseMsg = {
  id: "00000000-0000-0000-0000-000000000001",
  candidate_id: null,
  job_id: null,
  interview_id: null,
  template_code: null,
  to_emails: ["a@example.com"],
  cc_emails: [] as string[],
  subject: "Hi",
  body_html: "<p>Hi</p>",
  retry_count: 0,
  in_reply_to: null,
  conversation_id: null,
};

describe("sendOne", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls markSent on Graph success", async () => {
    (sendMail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      graphMessageId: null,
      fromAddress: "hr@matkinh.com.vn",
    });
    const out = await sendOne(baseMsg);
    expect(out.result).toBe("sent");
    expect(repo.markSent).toHaveBeenCalledWith(baseMsg.id);
    expect(repo.markFailed).not.toHaveBeenCalled();
    expect(repo.bumpRetry).not.toHaveBeenCalled();
  });

  it("marks failed immediately on auth error (kind=auth)", async () => {
    (sendMail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SendMailError("auth", "401 unauthorized", { statusCode: 401 }),
    );
    const out = await sendOne(baseMsg);
    expect(out.result).toBe("failed");
    expect(repo.markFailed).toHaveBeenCalledWith(baseMsg.id, expect.stringContaining("[auth"));
    expect(repo.bumpRetry).not.toHaveBeenCalled();
  });

  it("marks failed immediately on permanent error", async () => {
    (sendMail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SendMailError("permanent", "Bad request"),
    );
    const out = await sendOne(baseMsg);
    expect(out.result).toBe("failed");
    expect(repo.markFailed).toHaveBeenCalled();
    expect(repo.bumpRetry).not.toHaveBeenCalled();
  });

  it("bumps retry on transient error when under limit", async () => {
    (sendMail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SendMailError("transient", "503 Service Unavailable", { statusCode: 503 }),
    );
    const out = await sendOne({ ...baseMsg, retry_count: 0 });
    expect(out.result).toBe("retried");
    expect(repo.bumpRetry).toHaveBeenCalledWith(
      baseMsg.id,
      1,
      expect.any(Date),
      expect.stringContaining("transient"),
    );
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it("uses Retry-After header on 429 throttle", async () => {
    (sendMail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SendMailError("throttle", "429", { statusCode: 429, retryAfterSec: 120 }),
    );
    await sendOne({ ...baseMsg, retry_count: 0 });
    const [, , nextRetryAt] = (repo.bumpRetry as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const delta = (nextRetryAt as Date).getTime() - Date.now();
    // 120s ± 1s tolerance for test timing
    expect(delta).toBeGreaterThan(119_000);
    expect(delta).toBeLessThan(125_000);
  });

  it("marks failed after SEND_MAX_ATTEMPTS retries", async () => {
    (sendMail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SendMailError("transient", "503"),
    );
    const out = await sendOne({ ...baseMsg, retry_count: SEND_MAX_ATTEMPTS - 1 });
    expect(out.result).toBe("failed");
    expect(repo.markFailed).toHaveBeenCalled();
    expect(repo.bumpRetry).not.toHaveBeenCalled();
  });

  it("rejects rows with no recipients without calling Graph", async () => {
    const out = await sendOne({ ...baseMsg, to_emails: [] });
    expect(out.result).toBe("failed");
    expect(sendMail).not.toHaveBeenCalled();
    expect(repo.markFailed).toHaveBeenCalledWith(
      baseMsg.id,
      expect.stringContaining("Không có địa chỉ"),
    );
  });

  it("rejects rows with empty body without calling Graph", async () => {
    const out = await sendOne({ ...baseMsg, body_html: null });
    expect(out.result).toBe("failed");
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("drainQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns idle when no rows", async () => {
    (repo.listDrainableEmails as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const summary = await drainQueue(10);
    expect(summary.drained).toBe(0);
    expect(summary.sent).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("processes rows sequentially and sums outcomes", async () => {
    (repo.listDrainableEmails as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { ...baseMsg, id: "id1" },
      { ...baseMsg, id: "id2" },
    ]);
    (sendMail as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ graphMessageId: null, fromAddress: "x" })
      .mockRejectedValueOnce(new SendMailError("permanent", "bad"));
    const summary = await drainQueue(10);
    expect(summary.drained).toBe(2);
    expect(summary.sent).toBe(1);
    expect(summary.failed).toBe(1);
  });
});
