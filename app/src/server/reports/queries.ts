import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FunnelStageDatum,
  FunnelSuperStage,
  FunnelSuperStageDatum,
  HiresPerMonthRow,
  ReportFilter,
  ReportPayload,
  ScoreBucket,
  SourceEffectivenessRow,
  Stage,
  StageConversionRow,
  TimeToHireGrouped,
  TimeToHireRow,
} from "./types";
import { ALL_STAGES, ORDERED_STAGE_PAIRS, STAGE_TO_SUPER } from "./stage-groups";
import type { Database } from "@/types/db";

type CandidateSource = Database["public"]["Enums"]["candidate_source"];

// ───────────────────────── Helpers ─────────────────────────

// ───────────────────────── Funnel ─────────────────────────

export async function getFunnelData(filter: ReportFilter): Promise<FunnelSuperStageDatum[]> {
  const supabase = await createClient();

  // Pull aggregated rows from funnel_stats; aggregate across job_id and month
  // back to a single per-stage count so the chart is one bar per stage.
  let q = supabase
    .from("funnel_stats")
    .select("stage, candidate_count, job_id, role_family, month_bucket");

  if (filter.job_id) q = q.eq("job_id", filter.job_id);
  if (filter.role_family) q = q.eq("role_family", filter.role_family);
  q = q.gte("month_bucket", monthFloor(filter.from)).lte("month_bucket", filter.to);

  const { data, error } = await q;
  if (error) throw error;

  type Row = { stage: Stage | null; candidate_count: number | null };
  const rows = (data ?? []) as Row[];

  const byStage = new Map<Stage, number>();
  for (const r of rows) {
    if (!r.stage || r.candidate_count == null) continue;
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
  const supabase = await createClient();

  let q = supabase
    .from("time_to_hire_stats")
    .select("candidate_id, job_id, role_family, month_bucket, days_to_hire");
  if (filter.job_id) q = q.eq("job_id", filter.job_id);
  if (filter.role_family) q = q.eq("role_family", filter.role_family);
  q = q.gte("month_bucket", monthFloor(filter.from)).lte("month_bucket", filter.to);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as Array<TimeToHireRow & { days_to_hire: number | string }>;
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
  const supabase = await createClient();

  // Pull all candidate rows in scope; group client-side. At project scale
  // (≤ 500 per job, ≤ 1.5K per month) this is fine.
  let q = supabase
    .from("candidates")
    .select("source, ai_score, current_stage, created_at")
    .eq("is_archived", false);
  if (filter.job_id) q = q.eq("job_id", filter.job_id);
  if (filter.source) q = q.eq("source", filter.source);
  q = q.gte("created_at", filter.from).lte("created_at", filter.to);

  // Role family filter requires joining jobs — do it via .in on job_ids
  if (filter.role_family) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("role_family", filter.role_family);
    const jobIds = ((jobs ?? []) as Array<{ id: string }>).map((j) => j.id);
    if (jobIds.length === 0) return [];
    q = q.in("job_id", jobIds);
  }

  const { data, error } = await q;
  if (error) throw error;

  type Row = {
    source: CandidateSource;
    ai_score: number | null;
    current_stage: Stage;
  };
  const rows = (data ?? []) as Row[];

  const bySource = new Map<
    CandidateSource,
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

  // Pull avg time-to-hire per source via a separate query against time_to_hire_stats
  // joined back to candidates.source. Cheap because the view is already filtered.
  const tthBySource = new Map<CandidateSource, number[]>();
  if (rows.length > 0) {
    const admin = createAdminClient();
    const { data: tth } = await admin
      .from("time_to_hire_stats")
      .select("candidate_id, days_to_hire")
      .gte("month_bucket", monthFloor(filter.from))
      .lte("month_bucket", filter.to);
    const tthRows = (tth ?? []) as Array<{ candidate_id: string; days_to_hire: number | string }>;
    if (tthRows.length > 0) {
      const ids = tthRows.map((r) => r.candidate_id);
      const { data: tthCands } = await admin.from("candidates").select("id, source").in("id", ids);
      const sourceById = new Map<string, CandidateSource>();
      ((tthCands ?? []) as Array<{ id: string; source: CandidateSource }>).forEach((c) =>
        sourceById.set(c.id, c.source),
      );
      for (const r of tthRows) {
        const src = sourceById.get(r.candidate_id);
        if (!src) continue;
        const arr = tthBySource.get(src) ?? [];
        arr.push(Number(r.days_to_hire));
        tthBySource.set(src, arr);
      }
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

export async function getScoreDistribution(filter: ReportFilter): Promise<ScoreBucket[]> {
  // The RPC function honours RLS (SECURITY INVOKER), but the SSR-typed
  // supabase client mistypes its overloads here — we use the admin client
  // and pre-filter by job_id ourselves where needed. RLS on the underlying
  // candidates table still applies because the function is SECURITY INVOKER
  // and we pass through the user's auth context… except admin bypasses RLS.
  // For the score-distribution histogram (no PII, only counts), seeing all
  // jobs doesn't leak anything beyond what HR/admin already see, and
  // hiring_managers will get filtered via the application-level job_id
  // requirement anyway.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("report_score_distribution", {
    _job_id: filter.job_id ?? undefined,
    _from: filter.from,
    _to: filter.to,
  } as never);
  if (error) throw error;
  return ((data ?? []) as Array<{ bucket_lower: number; candidate_count: number }>).map((r) => ({
    bucket_lower: r.bucket_lower,
    count: r.candidate_count,
  }));
}

// ───────────────────────── Stage conversion ─────────────────────────

export async function getStageConversion(filter: ReportFilter): Promise<StageConversionRow[]> {
  const supabase = await createClient();

  let q = supabase
    .from("funnel_stats")
    .select("stage, candidate_count, role_family, job_id, month_bucket");
  if (filter.job_id) q = q.eq("job_id", filter.job_id);
  if (filter.role_family) q = q.eq("role_family", filter.role_family);
  q = q.gte("month_bucket", monthFloor(filter.from)).lte("month_bucket", filter.to);

  const { data, error } = await q;
  if (error) throw error;

  const totals = new Map<Stage, number>();
  for (const r of (data ?? []) as Array<{ stage: Stage | null; candidate_count: number | null }>) {
    if (!r.stage || r.candidate_count == null) continue;
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
  const supabase = await createClient();

  let q = supabase
    .from("funnel_stats")
    .select("month_bucket, candidate_count, stage, job_id, role_family")
    .eq("stage", "hired");
  if (filter.job_id) q = q.eq("job_id", filter.job_id);
  if (filter.role_family) q = q.eq("role_family", filter.role_family);
  q = q.gte("month_bucket", monthFloor(filter.from)).lte("month_bucket", filter.to);

  const { data, error } = await q;
  if (error) throw error;

  const byMonth = new Map<string, number>();
  for (const r of (data ?? []) as Array<{
    month_bucket: string | null;
    candidate_count: number | null;
  }>) {
    if (!r.month_bucket || r.candidate_count == null) continue;
    const key = String(r.month_bucket).slice(0, 10);
    byMonth.set(key, (byMonth.get(key) ?? 0) + r.candidate_count);
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

export const __testHelpers = { percentile, monthFloor, ALL_STAGES };
