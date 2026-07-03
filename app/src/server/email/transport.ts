import "server-only";
import { sendMail } from "@/lib/graph/email";
import { getEmailBinding, sendViaCloudflare } from "@/lib/email/cloudflare";

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
 * Throws `SendMailError` (from either transport) so callers keep one error
 * taxonomy.
 */
export async function deliverMail(input: DeliverMailInput): Promise<void> {
  const cfEmail = await getEmailBinding();
  if (cfEmail) {
    await sendViaCloudflare(cfEmail, input);
    return;
  }
  await sendMail({
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    bodyHtml: input.bodyHtml,
  });
}
