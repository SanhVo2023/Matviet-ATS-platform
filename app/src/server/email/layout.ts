/**
 * Branded outbound-email layout — pure string builders, no server-only import
 * so template tests can exercise them directly.
 *
 * Every mail leaving the app (queue sends, password reset, future ad-hoc)
 * passes through `deliverMail`, which wraps the template body in this shell.
 * DB templates therefore stay plain `<p>` content — HR edits copy, the shell
 * owns the chrome. Table-based + inline styles only (email clients ignore
 * <style> blocks); system fonts because webfonts are unreliable in email.
 */

const NAVY = "#13245C";
const GOLD = "#FFC107";
const FONT = "Arial, Helvetica, sans-serif";

/** True when the body is already a full document (agent pasted raw HTML). */
export function isFullHtmlDocument(html: string): boolean {
  return /<html[\s>]|data-mv-branded/i.test(html);
}

export interface BrandEmailInput {
  /** Inner content HTML — plain paragraphs from the template renderer. */
  bodyHtml: string;
  /** Hidden inbox-preview line; defaults to nothing. */
  preheader?: string;
  /** <title> for clients that show it; usually the subject. */
  title?: string;
}

/** Wrap template content in the Mắt Việt navy+gold shell. Idempotent. */
export function brandEmailHtml({ bodyHtml, preheader, title }: BrandEmailInput): string {
  if (isFullHtmlDocument(bodyHtml)) return bodyHtml;
  const safeTitle = (title ?? "Mắt Việt HR").replace(/</g, "&lt;");
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader.replace(/</g, "&lt;")}</div>`
    : "";
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
</head>
<body data-mv-branded style="margin:0;padding:0;background-color:#F1F5F9;">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <tr>
          <td style="background-color:${NAVY};border-radius:12px 12px 0 0;padding:18px 32px;">
            <span style="font-family:${FONT};font-size:18px;font-weight:bold;color:#FFFFFF;letter-spacing:3px;">M&#7854;T VI&#7878;T</span>
            <span style="font-family:${FONT};font-size:11px;color:${GOLD};letter-spacing:2px;">&nbsp;&middot;&nbsp;PH&#210;NG NH&#194;N S&#7920;</span>
          </td>
        </tr>
        <tr>
          <td style="height:4px;background-color:${GOLD};font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="background-color:#FFFFFF;padding:32px;font-family:${FONT};font-size:14px;line-height:1.7;color:#1F2937;">
${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:#FFFFFF;border-radius:0 0 12px 12px;border-top:1px solid #E5E7EB;padding:16px 32px;font-family:${FONT};font-size:11px;line-height:1.6;color:#9CA3AF;">
            Email &#273;&#432;&#7907;c g&#7917;i t&#7921; &#273;&#7897;ng t&#7915; h&#7879; th&#7889;ng tuy&#7875;n d&#7909;ng M&#7855;t Vi&#7879;t.<br>
            C&#7847;n h&#7895; tr&#7907;? Vui l&#242;ng tr&#7843; l&#7901;i tr&#7921;c ti&#7871;p email n&#224;y.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Bulletproof-ish CTA button for template/system bodies (e.g. password reset). */
export function emailCtaButton(href: string, label: string): string {
  const safeHref = href.replace(/"/g, "&quot;");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="background-color:${NAVY};border-radius:8px;"><a href="${safeHref}" style="display:inline-block;padding:12px 28px;font-family:${FONT};font-size:14px;font-weight:bold;color:${GOLD};text-decoration:none;">${label}</a></td></tr></table>`;
}

/**
 * Plain-text alternative from the UNWRAPPED body (spam scores improve with a
 * text part; deriving it pre-wrap keeps the header/footer chrome out of it).
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return text && text !== href ? `${text} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
