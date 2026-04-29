/**
 * Shared types for the Gemini scoring pipeline.
 *
 * Lives here so both the Next.js server (Server Actions, repository, UI) and
 * the Supabase Edge Function (Deno) can import the same shape definitions.
 * The Edge Function bundle inlines its own copies via deploy_edge_function;
 * this file remains the canonical source.
 */

export const CRITERION_CODES = [
  "industry_fit",
  "professional_skills",
  "work_experience",
  "years_experience",
  "education",
  "location",
] as const;

export type CriterionCode = (typeof CRITERION_CODES)[number];

export type Weights = Record<CriterionCode, number>;

export interface ParsedCv {
  personal: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    date_of_birth: string | null;
  };
  experience: Array<{
    company: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    description: string | null;
    industry: string | null;
  }>;
  education: Array<{
    institution: string;
    degree: string | null;
    field: string | null;
    start_date: string | null;
    end_date: string | null;
  }>;
  skills: string[];
  languages: Array<{ name: string; level: string | null }>;
  certifications: Array<{ name: string; issuer: string | null; year: string | null }>;
  total_years_experience: number | null;
  /** Synthesized at parse time — concatenated text used for evidence verification. */
  _raw_text: string;
}

export interface CriterionResult {
  score: number; // 0-100
  reasoning: string;
  evidence_quotes: string[];
}

export interface ScoreResult {
  per_criterion: Record<CriterionCode, CriterionResult>;
  overall_summary: string;
}

export interface VerifiedEvidenceQuote {
  text: string;
  verified: boolean;
}

export interface VerifiedCriterionResult {
  score: number;
  reasoning: string;
  evidence_quotes: VerifiedEvidenceQuote[];
}

export type VerifiedCriteria = Record<CriterionCode, VerifiedCriterionResult>;

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}
