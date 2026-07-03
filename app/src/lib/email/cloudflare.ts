import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SendMailError } from "@/lib/graph/email";

/**
 * Outbound email via Cloudflare Email Service (Workers `send_email` binding).
 *
 * The matviet.com.vn zone is onboarded to Email Sending (SPF + DKIM on the
 * cf-bounce subdomain, verified 2026-07-03). Inbound mail stays on the
 * company's Google Workspace MX — replies to the from-address land there.
 *
 * This is the PRIMARY transport; MS Graph (`@/lib/graph/email`) remains the
 * fallback when the binding is absent (plain `next dev`, tests) AND Graph
 * secrets are configured. Errors are normalized to `SendMailError` so the
 * queue's retry classification (auth/throttle/transient/permanent) is shared.
 */

/** Minimal shape of the `send_email` binding's object-payload API. */
export interface CloudflareEmailBinding {
  send(message: {
    to: string | string[];
    cc?: string[];
    from: { email: string; name?: string };
    replyTo?: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<{ messageId?: string }>;
}

export interface CloudflareSendInput {
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
}

/** Returns the binding if deployed with `send_email`, else null (dev/tests). */
export async function getEmailBinding(): Promise<CloudflareEmailBinding | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const binding = (env as { EMAIL?: CloudflareEmailBinding }).EMAIL;
    return binding ?? null;
  } catch {
    return null;
  }
}

async function fromIdentity(): Promise<{ email: string; name: string }> {
  const { env } = await getCloudflareContext({ async: true });
  return {
    email: env.EMAIL_FROM_ADDRESS || "hr@matviet.com.vn",
    name: env.EMAIL_FROM_NAME || "Mắt Việt HR",
  };
}

export async function sendViaCloudflare(
  binding: CloudflareEmailBinding,
  input: CloudflareSendInput,
): Promise<{ fromAddress: string }> {
  const from = await fromIdentity();
  try {
    await binding.send({
      to: input.to,
      cc: input.cc?.length ? input.cc : undefined,
      from,
      subject: input.subject,
      html: input.bodyHtml,
      // Plain-text alternative improves spam scores; strip tags naively.
      text: input.bodyHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim(),
    });
    return { fromAddress: from.email };
  } catch (err) {
    throw classifyCloudflareEmailError(err);
  }
}

/** Map Email Service E_* codes onto the queue's retry taxonomy. */
function classifyCloudflareEmailError(err: unknown): SendMailError {
  const code = (err as { code?: string })?.code ?? "";
  const message = err instanceof Error ? err.message : "Unknown Cloudflare Email error";
  if (code === "E_RATE_LIMIT_EXCEEDED" || code === "E_DAILY_LIMIT_EXCEEDED") {
    return new SendMailError("throttle", `Email Service rate-limited: ${message}`, {
      retryAfterSec: 120,
      cause: err,
    });
  }
  if (code === "E_INTERNAL_SERVER_ERROR" || code === "E_DELIVERY_FAILED") {
    return new SendMailError("transient", `Email Service: ${message}`, { cause: err });
  }
  if (code === "E_SENDER_NOT_VERIFIED" || code === "E_SENDER_DOMAIN_NOT_AVAILABLE") {
    return new SendMailError("auth", `Email Service sender not verified: ${message}`, {
      cause: err,
    });
  }
  if (err instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(err.message)) {
    return new SendMailError("transient", `Network: ${message}`, { cause: err });
  }
  // Validation, suppressed recipient, content too large, unknown → permanent.
  return new SendMailError("permanent", `Email Service [${code || "unknown"}]: ${message}`, {
    cause: err,
  });
}
