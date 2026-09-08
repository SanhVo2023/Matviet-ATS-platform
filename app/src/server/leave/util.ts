/**
 * Pure leave math (HRM H2) — no DB, unit-tested. Dates are YYYY-MM-DD.
 */

/** Whole calendar days in [start, end] inclusive (min 1). */
export function inclusiveDays(startIso: string, endIso: string): number {
  const s = Date.parse(startIso);
  const e = Date.parse(endIso);
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
  return Math.floor((e - s) / 86_400_000) + 1;
}

/** Completed years of service between start and asOf (floored). */
export function yearsOfService(startIso: string | null, asOfIso: string): number {
  if (!startIso) return 0;
  const start = new Date(startIso);
  const asOf = new Date(asOfIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(asOf.getTime())) return 0;
  let years = asOf.getFullYear() - start.getFullYear();
  const anniversary = new Date(start);
  anniversary.setFullYear(start.getFullYear() + years);
  if (anniversary > asOf) years -= 1;
  return Math.max(0, years);
}

/**
 * Annual leave entitlement (ngày phép năm) per Bộ luật Lao động 2019:
 * 12 days base + 1 day per 5 completed years of service (Điều 113 + 114).
 */
export function annualLeaveEntitlement(startIso: string | null, asOfIso: string): number {
  return 12 + Math.floor(yearsOfService(startIso, asOfIso) / 5);
}

/** Two date ranges [aStart,aEnd] and [bStart,bEnd] overlap (inclusive). */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Date.parse(aStart) <= Date.parse(bEnd) && Date.parse(bStart) <= Date.parse(aEnd);
}
