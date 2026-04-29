import type { Database } from "@/types/db";

export type Stage = Database["public"]["Enums"]["pipeline_stage"];
export type RoleFamily = Database["public"]["Enums"]["role_family"];
export type Source = Database["public"]["Enums"]["candidate_source"];

/** URL-synced filter shape applied to every report query. */
export interface ReportFilter {
  /** ISO 8601 timestamp at the start of the range (inclusive). */
  from: string;
  /** ISO 8601 timestamp at the end of the range (inclusive). */
  to: string;
  /** Restrict to a specific job; null = all jobs the caller can see. */
  job_id: string | null;
  /** Restrict to a specific role family; null = all. */
  role_family: RoleFamily | null;
  /** Restrict to a specific candidate source; null = all. */
  source: Source | null;
}

// ──────────────────────── Funnel ────────────────────────

export interface FunnelStageDatum {
  stage: Stage;
  count: number;
}

/** 5 supersets shown in the chart; full breakdown lives in tooltips. */
export type FunnelSuperStage =
  | "applied"
  | "screening"
  | "interview"
  | "approval"
  | "offer"
  | "hired"
  | "rejected";

export interface FunnelSuperStageDatum {
  super_stage: FunnelSuperStage;
  count: number;
  /** Stages from `pipeline_stage` enum that roll up into this superset. */
  stage_breakdown: FunnelStageDatum[];
}

// ──────────────────────── Time-to-hire ────────────────────────

export interface TimeToHireRow {
  candidate_id: string;
  job_id: string;
  role_family: RoleFamily | null;
  month_bucket: string;
  days_to_hire: number;
}

export interface TimeToHireGrouped {
  role_family: RoleFamily | null;
  median_days: number;
  p90_days: number;
  hire_count: number;
}

// ──────────────────────── Source effectiveness ────────────────────────

export interface SourceEffectivenessRow {
  source: Source;
  candidates_in: number;
  hires_out: number;
  hire_rate: number; // 0..1
  avg_days_to_hire: number | null;
  avg_ai_score: number | null;
}

// ──────────────────────── Score distribution ────────────────────────

export interface ScoreBucket {
  bucket_lower: number; // 0, 10, 20, ..., 90
  count: number;
}

// ──────────────────────── Stage conversion ────────────────────────

export interface StageConversionRow {
  from_stage: Stage;
  to_stage: Stage;
  upstream_count: number;
  crossed_count: number;
  conversion_pct: number; // 0..100
}

// ──────────────────────── Hires per month ────────────────────────

export interface HiresPerMonthRow {
  month_bucket: string; // ISO date "2026-04-01"
  hire_count: number;
}

// ──────────────────────── Top-level payload ────────────────────────

export interface ReportPayload {
  filter: ReportFilter;
  funnel: FunnelSuperStageDatum[];
  time_to_hire: TimeToHireGrouped[];
  source_effectiveness: SourceEffectivenessRow[];
  score_distribution: ScoreBucket[];
  stage_conversion: StageConversionRow[];
  hires_per_month: HiresPerMonthRow[];
  /** Total candidates in scope (filter applied, RLS-bounded). */
  total_candidates: number;
}
