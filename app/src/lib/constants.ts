/**
 * Mắt Việt HR — non-i18n constants and code-level enum lists.
 *
 * Vietnamese display text lives in `src/lib/i18n.ts`.
 * Postgres enums live in migrations and are the canonical source for codes —
 * the lists below mirror those enums for client-side iteration (form selects,
 * weights editor, etc.) and are kept short on purpose. Database types come
 * from `src/types/db.ts` (auto-generated).
 */

/** Six AI scoring criterion codes (also Postgres jobs.weights JSONB keys) */
export const SCORING_CRITERION_CODES = [
  "industry_fit",
  "professional_skills",
  "work_experience",
  "years_experience",
  "education",
  "location",
] as const;

export type CriterionCode = (typeof SCORING_CRITERION_CODES)[number];

/** Default weight templates per role family — mirrors `weight_templates` rows
 * seeded in migration 0010. Used to pre-fill the job creation form before any
 * DB query is needed; the canonical values still live server-side. */
export const DEFAULT_WEIGHT_TEMPLATES: Record<string, Record<CriterionCode, number>> = {
  sales: {
    industry_fit: 0.2,
    professional_skills: 0.2,
    work_experience: 0.2,
    years_experience: 0.15,
    education: 0.1,
    location: 0.15,
  },
  optician: {
    industry_fit: 0.25,
    professional_skills: 0.3,
    work_experience: 0.15,
    years_experience: 0.1,
    education: 0.15,
    location: 0.05,
  },
  office: {
    industry_fit: 0.15,
    professional_skills: 0.25,
    work_experience: 0.2,
    years_experience: 0.15,
    education: 0.15,
    location: 0.1,
  },
  manager: {
    industry_fit: 0.2,
    professional_skills: 0.2,
    work_experience: 0.25,
    years_experience: 0.2,
    education: 0.1,
    location: 0.05,
  },
};

/** Hard limits documented in CLAUDE.md §Operational defaults — mirror server-side validation. */
export const LIMITS = {
  cvFileMaxBytes: 10 * 1024 * 1024, // 10 MB
  emailBodyMaxBytes: 50 * 1024, // 50 KB
  candidatesPerJobMax: 500,
  candidatesPerJobWarn: 200,
  concurrentUploadsMax: 5,
  cvPagesMax: 20,
  interviewAttendeesMax: 10,
} as const;

/** Stage rendering order for the kanban / pipeline. Matches enum pipeline_stage. */
export const PIPELINE_STAGE_ORDER = [
  "new",
  "screening",
  "screened",
  "interview_scheduled",
  "interviewed",
  "test_sent",
  "test_done",
  "recommended",
  "salary_deal",
  "bod_review",
  "tap_doan_review",
  "offer_sent",
  "offer_accepted",
  "hired",
  "rejected",
  "withdrew",
] as const;
