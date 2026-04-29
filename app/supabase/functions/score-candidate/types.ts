// Mirror of app/src/lib/ai/gemini/types.ts for the Deno Edge Function.
// Keep in sync.

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
  _raw_text: string;
}

export interface CriterionResult {
  score: number;
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
