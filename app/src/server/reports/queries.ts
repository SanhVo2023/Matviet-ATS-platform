import "server-only";
import { and, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates, jobs } from "@/db/schema";
import type {
  FunnelStageDatum,
  FunnelSuperStage,
  FunnelSuperStageDatum,
  HiresPerMonthRow,
  ReportFilter,
  ReportPayload,
  ScoreBucket,
  Source,
  SourceEffectivenessRow,
  Stage,
  StageConversionRow,
  TimeToHireGrouped,
} from "./types";
import { ALL_STAGES, ORDERED_STAGE_PAIRS, STAGE_TO_SUPER } from "./stage-groups";

// ───────────────────────── Inlined view: funnel_stats ─────────────────────────
//
// The old Postgres view `funnel_stats` (migration 0018) does not exist in D1.
// Equivalent SQLite query, inlined: per stage + month bucket, count of distinct
// candidates that reached that stage (built on stage_history, so a candidate who
// reached `hired` also counts at every prior stage they passed).
//
// Month bucket: strftime('%Y-%m-01', sh.at) — the SQLite stand-in for Postgres
// date_trunc('month', …) — yields "YYYY-MM-01", which compares correctly against
// both "YYYY-MM-01" floors and full ISO timestamps under lexicographic ordering.

interface FunnelRow {
  stage: Stage;
  month_bucket: string;
  candidate_count: number;
}

async function queryFunnelRows(filter: ReportFilter): Promise<FunnelRow[]> {
  const db = await getDb();

  const conds: SQL[] = [
    sql`c.is_archived = 0`,
    sql`strftime('%Y-%m-01', sh.at) >= ${monthFloorDate(filter.from)}`,
    sql`strftime('%Y-%m-01', sh.at) <= ${filter.to}`,
  ];
  if (filter.job_id) conds.push(sql`c.job_id = ${filter.job_id}`);
  if (filter.role_family) conds.push(sql`j.role_family = ${filter.role_family}`);

  return db.all<FunnelRow>(sql`
    select
      sh.to_stage as stage,
      strftime('%Y-%m-01', sh.at) as month_bucket,
      count(distinct sh.candidate_id) as candidate_count
    from stage_history sh
    join candidates c on c.id = sh.candidate_id
    join jobs j on j.id = c.job_id
    where ${sql.join(conds, sql` and `)}
    group by sh.to_stage, strftime('%Y-%m-01', sh.at)
  `);
}

// ───────────────────────── Inlined view: time_to_hire_stats ─────────────────────────
//
// For every candidate with a `to_stage='hired'` stage_history row, days between
// their first stage_history entry and the hired entry. `julianday(a) - julianday(b)`
// replaces Postgres `extract(epoch from …) / 86400` — both yield fractional days.

interface TthRow {
  source: Source;
  role_family: TimeToHireGrouped["role_family"];
  days_to_hire: number;
}

async function queryTimeToHireRows(
  filter: Pick<ReportFilter, "from" | "to"> & Partial<ReportFilter>,
): Promise<TthRow[]> {
  const db = await getDb();

  const conds: SQL[] = [
    sql`c.is_archived = 0`,
    sql`strftime('%Y-%m-01', h.hired_at) >= ${monthFloorDate(filter.from)}`,
    sql`strftime('%Y-%m-01', h.hired_at) <= ${filter.to}`,
  ];
  if (filter.job_id) conds.push(sql`c.job_id = ${filter.job_id}`);
  if (filter.role_family) conds.push(sql`j.role_family = ${filter.role_family}`);

  return db.all<TthRow>(sql`
    with started as (
      select candidate_id, min(at) as started_at
      from stage_history
      group by candidate_id
    ),
    hired as (
      select candidate_id, min(at) as hired_at
      from stage_history
      where to_stage = 'hired'
      group by candidate_id
    )
    select
      c.source as source,
      j.role_family as role_family,
      julianday(h.hired_at) - julianday(s.started_at) as days_to_hire
    from hired h
    join started s on s.candidate_id = h.candidate_id
    join candidates c on c.id = h.candidate_id
    join jobs j on j.id = c.job_id
    where ${sql.join(conds, sql` and `)}
  `);
}

// ───────────────────────── Funnel ─────────────────────────

export async function getFunnelData(filter: ReportFilter): Promise<FunnelSuperStageDatum[]> {
  const rows = await queryFunnelRows(filter);

  // Aggregate across month buckets back to a single per-stage count so the
  // chart is one bar per stage.
  const byStage = new Map<Stage, number>();
  for (const r of rows) {
    byStage.set(r.stage, (byStage.get(r.stage) ?? 0) + r.candidate_count);
  }

  // Roll up into supersets
  const supersets = new Map<FunnelSuperStage, FunnelStageDatum[]>();
  for (const [stage, count] of byStage.entries()) {
    const sup = STAGE_TO_SUPER[stage];
    const arr = supersets.get(sup) ?? [];
    arr.push({ stage, count });
    supersets.set(sup, arr);
  }

  const order: FunnelSuperStage[] = [
    "applied",
    "screening",
    "interview",
    "approval",
    "offer",
    "hired",
    "rejected",
  ];
  return order
    .map((sup) => {
      const breakdown = supersets.get(sup) ?? [];
      const total = breakdown.reduce((a, b) => a + b.count, 0);
      return { super_stage: sup, count: total, stage_breakdown: breakdown };
    })
    .filter((r) => r.count > 0);
}

// ───────────────────────── Time-to-hire ─────────────────────────

export async function getTimeToHire(filter: ReportFilter): Promise<TimeToHireGrouped[]> {
  const rows = await queryTimeToHireRows(filter);

  const byFamily = new Map<string, number[]>();
  for (const r of rows) {
    const key = r.role_family ?? "unknown";
    const arr = byFamily.get(key) ?? [];
    arr.push(Number(r.days_to_hire));
    byFamily.set(key, arr);
  }

  const out: TimeToHireGrouped[] = [];
  for (const [family, days] of byFamily.entries()) {
    days.sort((a, b) => a - b);
    out.push({
      role_family: family === "unknown" ? null : (family as TimeToHireGrouped["role_family"]),
      median_days: percentile(days, 0.5),
      p90_days: percentile(days, 0.9),
      hire_count: days.length,
    });
  }
  return out;
}

// ───────────────────────── Source effectiveness ─────────────────────────

export async function getSourceEffectiveness(
  filter: ReportFilter,
): Promise<SourceEffectivenessRow[]> {
  const db = await getDb();

  // Pull all candidate rows in scope; group client-side. At project scale
  // (≤ 500 per job, ≤ 1.5K per month) this is fine.
  const conds = [
    eq(candidates.is_archived, false),
    gte(candidates.created_at, filter.from),
    lte(candidates.created_at, filter.to),
  ];
  if (filter.job_id) conds.push(eq(candidates.job_id, filter.job_id));
  if (filter.source) conds.push(eq(candidates.source, filter.source));

  // Role family filter requires joining jobs — do it via inArray on job ids
  if (filter.role_family) {
    const jobRows = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.role_family, filter.role_family));
    if (jobRows.length === 0) return [];
    conds.push(
      inArray(
        candidates.job_id,
        jobRows.map((j) => j.id),
      ),
    );
  }

  const rows = await db
    .select({
      source: candidates.source,
      ai_score: candidates.ai_score,
      current_stage: candidates.current_stage,
    })
    .from(candidates)
    .where(and(...conds));

  const bySource = new Map<
    Source,
    { in: number; hired: number; scoreSum: number; scoreCount: number }
  >();
  for (const r of rows) {
    const acc = bySource.get(r.source) ?? { in: 0, hired: 0, scoreSum: 0, scoreCount: 0 };
    acc.in += 1;
    if (r.current_stage === "hired") acc.hired += 1;
    if (r.ai_score != null) {
      acc.scoreSum += r.ai_score;
      acc.scoreCount += 1;
    }
    bySource.set(r.source, acc);
  }

  // Avg time-to-hire per source via the inlined time_to_hire_stats query —
  // date range only (mirrors the old view read, which was not job/role scoped).
  const tthBySource = new Map<Source, number[]>();
  if (rows.length > 0) {
    const tthRows = await queryTimeToHireRows({ from: filter.from, to: filter.to });
    for (const r of tthRows) {
      const arr = tthBySource.get(r.source) ?? [];
      arr.push(Number(r.days_to_hire));
      tthBySource.set(r.source, arr);
    }
  }

  const out: SourceEffectivenessRow[] = [];
  for (const [source, acc] of bySource.entries()) {
    const tth = tthBySource.get(source) ?? [];
    out.push({
      source,
      candidates_in: acc.in,
      hires_out: acc.hired,
      hire_rate: acc.in > 0 ? acc.hired / acc.in : 0,
      avg_days_to_hire: tth.length > 0 ? tth.reduce((a, b) => a + b, 0) / tth.length : null,
      avg_ai_score: acc.scoreCount > 0 ? acc.scoreSum / acc.scoreCount : null,
    });
  }
  return out.sort((a, b) => b.candidates_in - a.candidates_in);
}

// ───────────────────────── Score distribution ─────────────────────────

// The old Postgres RPC `report_score_distribution` does not exist in D1 —
// inlined here. `min(90, cast(ai_score / 10.0 as integer) * 10)` replaces
// `least(90, floor(ai_score / 10) * 10)`: ai_score is non-negative, so CAST
// truncation equals floor, and SQLite's two-argument min() is scalar LEAST.
export async function getScoreDistribution(filter: ReportFilter): Promise<ScoreBucket[]> {
  const db = await getDb();

  const conds: SQL[] = [
    sql`c.is_archived = 0`,
    sql`c.ai_score is not null`,
    sql`c.created_at >= ${filter.from}`,
    sql`c.created_at <= ${filter.to}`,
  ];
  if (filter.job_id) conds.push(sql`c.job_id = ${filter.job_id}`);

  const rows = await db.all<{ bucket_lower: number; candidate_count: number }>(sql`
    select
      min(90, cast(c.ai_score / 10.0 as integer) * 10) as bucket_lower,
      count(*) as candidate_count
    from candidates c
    where ${sql.join(conds, sql` and `)}
    group by min(90, cast(c.ai_score / 10.0 as integer) * 10)
    order by 1
  `);

  return rows.map((r) => ({ bucket_lower: r.bucket_lower, count: r.candidate_count }));
}

// ───────────────────────── Stage conversion ─────────────────────────

export async function getStageConversion(filter: ReportFilter): Promise<StageConversionRow[]> {
  const rows = await queryFunnelRows(filter);

  const totals = new Map<Stage, number>();
  for (const r of rows) {
    totals.set(r.stage, (totals.get(r.stage) ?? 0) + r.candidate_count);
  }

  return ORDERED_STAGE_PAIRS.map(([from, to]) => {
    const upstream = totals.get(from) ?? 0;
    const crossed = totals.get(to) ?? 0;
    return {
      from_stage: from,
      to_stage: to,
      upstream_count: upstream,
      crossed_count: crossed,
      conversion_pct: upstream > 0 ? Math.round((crossed / upstream) * 1000) / 10 : 0,
    };
  });
}

// ───────────────────────── Hires per month ─────────────────────────

export async function getHiresPerMonth(filter: ReportFilter): Promise<HiresPerMonthRow[]> {
  const rows = await queryFunnelRows(filter);

  const byMonth = new Map<string, number>();
  for (const r of rows) {
    if (r.stage !== "hired") continue;
    // month_bucket is already "YYYY-MM-01"
    byMonth.set(r.month_bucket, (byMonth.get(r.month_bucket) ?? 0) + r.candidate_count);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month_bucket, hire_count]) => ({ month_bucket, hire_count }));
}

// ───────────────────────── Top-level assembler ─────────────────────────

/**
 * Build the full report payload — used by both the `/bao-cao` page and the
 * PDF/Excel export routes. One round-trip per query (six total) — at project
 * scale this is fast enough that batching them is overkill.
 */
export async function buildReportPayload(filter: ReportFilter): Promise<ReportPayload> {
  const [
    funnel,
    timeToHire,
    sourceEffectiveness,
    scoreDistribution,
    stageConversion,
    hiresPerMonth,
  ] = await Promise.all([
    getFunnelData(filter),
    getTimeToHire(filter),
    getSourceEffectiveness(filter),
    getScoreDistribution(filter),
    getStageConversion(filter),
    getHiresPerMonth(filter),
  ]);

  const totalCandidates =
    funnel.find((f) => f.super_stage === "applied")?.count ??
    funnel.reduce((acc, f) => Math.max(acc, f.count), 0);

  return {
    filter,
    funnel,
    time_to_hire: timeToHire,
    source_effectiveness: sourceEffectiveness,
    score_distribution: scoreDistribution,
    stage_conversion: stageConversion,
    hires_per_month: hiresPerMonth,
    total_candidates: totalCandidates,
  };
}

// ───────────────────────── Internal helpers ─────────────────────────

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = p * (sortedAsc.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return Math.round(sortedAsc[lo]! * 10) / 10;
  const blend = sortedAsc[lo]! + (sortedAsc[hi]! - sortedAsc[lo]!) * (rank - lo);
  return Math.round(blend * 10) / 10;
}

/** First day of the month containing `iso`, in ISO format. */
function monthFloor(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** First day of the month containing `iso`, as "YYYY-MM-01" (SQLite month bucket). */
function monthFloorDate(iso: string): string {
  return monthFloor(iso).slice(0, 10);
}

export const __testHelpers = { percentile, monthFloor, ALL_STAGES };
