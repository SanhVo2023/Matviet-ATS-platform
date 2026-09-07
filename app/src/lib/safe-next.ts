/**
 * Post-login redirect targets come from the `?next=` query param, which any
 * link can set — validate it so /dang-nhap?next=https://evil.example (or the
 * protocol-relative //evil.example) can never navigate off-site.
 */
export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  // "//host" and "/\host" are treated as protocol-relative URLs by browsers.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw === "/dang-nhap" || raw.startsWith("/dang-nhap?") || raw.startsWith("/dang-nhap/")) {
    return "/";
  }
  return raw;
}
