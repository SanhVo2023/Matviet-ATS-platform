import "server-only";
import { SendMailError } from "@/lib/graph/email";
import { deliverMail } from "./transport";
import {
  bumpRetry,
  listDrainableEmails,
  markFailed,
  markSent,
  type DrainableEmail,
} from "./repository";

export const SEND_MAX_ATTEMPTS = 3;

/** Backoff schedule for transient/throttle failures: 1m, 5m, 15m. */
function nextRetryDelayMs(retryCount: number, retryAfterSec?: number): number {
  if (retryAfterSec && retryAfterSec > 0) return Math.min(retryAfterSec * 1000, 60 * 60 * 1000);
  const ladder = [60_000, 5 * 60_000, 15 * 60_000];
  return ladder[Math.min(retryCount, ladder.length - 1)]!;
}

export interface SendOneOutcome {
  id: string;
  result: "sent" | "retried" | "failed";
  error?: string;
}

/** Send one queued message. Updates email_messages row in place. */
export async function sendOne(message: DrainableEmail): Promise<SendOneOutcome> {
  if (!message.to_emails?.length) {
    await markFailed(message.id, "Không có địa chỉ người nhận");
    return { id: message.id, result: "failed", error: "no recipient" };
  }
  if (!message.body_html) {
    await markFailed(message.id, "Không có nội dung email");
    return { id: message.id, result: "failed", error: "empty body" };
  }
  try {
    // Cloudflare Email Service first, MS Graph fallback — see transport.ts.
    await deliverMail({
      to: message.to_emails,
      cc: message.cc_emails?.length ? message.cc_emails : undefined,
      subject: message.subject,
      bodyHtml: message.body_html,
    });
    await markSent(message.id);
    return { id: message.id, result: "sent" };
  } catch (err) {
    const e =
      err instanceof SendMailError
        ? err
        : new SendMailError(
            "permanent",
            err instanceof Error ? err.message : "Unknown send error",
            { cause: err },
          );

    // auth + permanent → fail immediately. throttle + transient → retry up to SEND_MAX_ATTEMPTS.
    const retriable = e.kind === "throttle" || e.kind === "transient";
    const newRetryCount = message.retry_count + 1;
    if (!retriable || newRetryCount >= SEND_MAX_ATTEMPTS) {
      await markFailed(
        message.id,
        `[${e.kind}${e.statusCode ? ` ${e.statusCode}` : ""}] ${e.message}`,
      );
      return { id: message.id, result: "failed", error: e.message };
    }
    const delayMs = nextRetryDelayMs(message.retry_count, e.retryAfterSec);
    await bumpRetry(
      message.id,
      newRetryCount,
      new Date(Date.now() + delayMs),
      `[${e.kind}${e.statusCode ? ` ${e.statusCode}` : ""}] ${e.message} (lần ${newRetryCount}/${SEND_MAX_ATTEMPTS})`,
    );
    return { id: message.id, result: "retried", error: e.message };
  }
}

export interface DrainSummary {
  drained: number;
  sent: number;
  retried: number;
  failed: number;
  outcomes: SendOneOutcome[];
}

/**
 * Drain up to `limit` queued messages. Sends sequentially — outbound volume is
 * <5/day per CLAUDE.md, so parallelism would only invite Graph rate-limit.
 */
export async function drainQueue(limit: number): Promise<DrainSummary> {
  const rows = await listDrainableEmails(limit);
  const outcomes: SendOneOutcome[] = [];
  let sent = 0;
  let retried = 0;
  let failed = 0;
  for (const row of rows) {
    const outcome = await sendOne(row);
    outcomes.push(outcome);
    if (outcome.result === "sent") sent++;
    else if (outcome.result === "retried") retried++;
    else failed++;
  }
  return { drained: rows.length, sent, retried, failed, outcomes };
}
