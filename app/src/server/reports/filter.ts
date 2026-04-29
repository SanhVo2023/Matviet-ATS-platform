import type { ReportFilter, RoleFamily, Source } from "./types";

const VALID_ROLE_FAMILIES = ["sales", "optician", "office", "manager", "custom"] as const;
const VALID_SOURCES = [
  "manual_upload",
  "email_inbox",
  "csv_import",
  "topcv_api",
  "referral",
] as const;

/** Default range: last 30 days. */
export function defaultReportFilter(): ReportFilter {
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: past.toISOString(),
    to: now.toISOString(),
    job_id: null,
    role_family: null,
    source: null,
  };
}

/**
 * Parse a URL search-params object into a `ReportFilter`. Invalid values are
 * silently dropped to defaults — reports are read-only so we can be lenient.
 */
export function parseReportFilter(
  params: URLSearchParams | Record<string, string | undefined>,
): ReportFilter {
  const get = (k: string) =>
    params instanceof URLSearchParams ? params.get(k) : (params[k] ?? null);
  const def = defaultReportFilter();

  const fromRaw = get("from");
  const toRaw = get("to");
  const jobId = get("job") || null;
  const roleFamilyRaw = get("role");
  const sourceRaw = get("source");

  const from = isValidIso(fromRaw) ? new Date(fromRaw!).toISOString() : def.from;
  const to = isValidIso(toRaw) ? new Date(toRaw!).toISOString() : def.to;
  const role_family = (VALID_ROLE_FAMILIES as readonly string[]).includes(roleFamilyRaw ?? "")
    ? (roleFamilyRaw as RoleFamily)
    : null;
  const source = (VALID_SOURCES as readonly string[]).includes(sourceRaw ?? "")
    ? (sourceRaw as Source)
    : null;

  return { from, to, job_id: isUuid(jobId) ? jobId : null, role_family, source };
}

function isValidIso(v: string | null): boolean {
  if (!v) return false;
  // Accept "2026-04-29" or "2026-04-29T..." — Date constructor handles both.
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

function isUuid(v: string | null): v is string {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
