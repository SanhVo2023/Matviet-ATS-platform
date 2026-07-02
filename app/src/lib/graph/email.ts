import "server-only";
import { getMailboxAddress } from "./auth";
import { graphPost, GraphHttpError } from "./client";

export interface SendMailInput {
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  /** If set, the message is sent as a reply via /messages/{id}/reply, preserving thread headers. */
  replyToMessageId?: string;
  /** Optional Sent Items save flag. Defaults to true so chị Hương sees a copy in Outlook. */
  saveToSentItems?: boolean;
}

export interface SendMailResult {
  /** Always null — Graph's /sendMail returns 202 with no body and no message id. */
  graphMessageId: null;
  /** Resolved mailbox the message was sent from. */
  fromAddress: string;
}

export type SendMailFailureKind = "auth" | "throttle" | "permanent" | "transient";

export class SendMailError extends Error {
  readonly kind: SendMailFailureKind;
  readonly statusCode?: number;
  readonly retryAfterSec?: number;
  constructor(
    kind: SendMailFailureKind,
    message: string,
    options?: { statusCode?: number; retryAfterSec?: number; cause?: unknown },
  ) {
    super(message, options ? { cause: options.cause } : undefined);
    this.name = "SendMailError";
    this.kind = kind;
    this.statusCode = options?.statusCode;
    this.retryAfterSec = options?.retryAfterSec;
  }
}

function toRecipients(addresses: string[]) {
  return addresses.map((a) => ({ emailAddress: { address: a } }));
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const mailbox = getMailboxAddress();

  try {
    if (input.replyToMessageId) {
      await graphPost(`/users/${mailbox}/messages/${input.replyToMessageId}/reply`, {
        message: {
          body: { contentType: "HTML" as const, content: input.bodyHtml },
          toRecipients: toRecipients(input.to),
          ccRecipients: input.cc?.length ? toRecipients(input.cc) : undefined,
        },
      });
    } else {
      await graphPost(`/users/${mailbox}/sendMail`, {
        message: {
          subject: input.subject,
          body: { contentType: "HTML" as const, content: input.bodyHtml },
          toRecipients: toRecipients(input.to),
          ccRecipients: input.cc?.length ? toRecipients(input.cc) : undefined,
        },
        saveToSentItems: input.saveToSentItems ?? true,
      });
    }
    return { graphMessageId: null, fromAddress: mailbox };
  } catch (err) {
    throw classifyGraphError(err);
  }
}

function classifyGraphError(err: unknown): SendMailError {
  if (err instanceof GraphHttpError) {
    const status = err.statusCode;
    if (status === 401 || status === 403) {
      return new SendMailError("auth", `Graph auth/permission failed (${status}): ${err.message}`, {
        statusCode: status,
        cause: err,
      });
    }
    if (status === 429) {
      const retryAfter = err.retryAfterSec ?? 60;
      return new SendMailError("throttle", `Graph rate-limited: retry after ${retryAfter}s`, {
        statusCode: 429,
        retryAfterSec: retryAfter,
        cause: err,
      });
    }
    if (status >= 500 && status < 600) {
      return new SendMailError("transient", `Graph 5xx: ${err.message}`, {
        statusCode: status,
        cause: err,
      });
    }
    return new SendMailError("permanent", `Graph error (${status}): ${err.message}`, {
      statusCode: status,
      cause: err,
    });
  }
  if (err instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(err.message)) {
    return new SendMailError("transient", `Network: ${err.message}`, { cause: err });
  }
  return new SendMailError("permanent", err instanceof Error ? err.message : "Unknown send error", {
    cause: err,
  });
}
