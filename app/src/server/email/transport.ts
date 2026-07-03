import "server-only";
import { sendMail } from "@/lib/graph/email";
import { getEmailBinding, sendViaCloudflare } from "@/lib/email/cloudflare";
import { brandEmailHtml, htmlToText } from "./layout";

export interface DeliverMailInput {
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
}

/**
 * Single outbound-mail entry point for everything that isn't the queue worker
 * (password reset, future ad-hoc notifications). Transport preference:
 *
 *   1. Cloudflare Email Service (`send_email` binding) — production path,
 *      from hr@matviet.com.vn (EMAIL_FROM_ADDRESS), no keys needed.
 *   2. MS Graph — only when the binding is absent (plain `next dev`, tests)
 *      and Graph secrets are configured.
 *
 * Every body is wrapped in the branded navy+gold shell here (layout.ts) —
 * DB templates and callers provide content-only HTML. The plain-text
 * alternative is derived from the UNWRAPPED body so it stays readable.
 *
 * Throws `SendMailError` (from either transport) so callers keep one error
 * taxonomy.
 */
export async function deliverMail(input: DeliverMailInput): Promise<void> {
  const html = brandEmailHtml({ bodyHtml: input.bodyHtml, title: input.subject });
  const text = htmlToText(input.bodyHtml);

  const cfEmail = await getEmailBinding();
  if (cfEmail) {
    await sendViaCloudflare(cfEmail, {
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      bodyHtml: html,
      bodyText: text,
    });
    return;
  }
  await sendMail({
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    bodyHtml: html,
  });
}
