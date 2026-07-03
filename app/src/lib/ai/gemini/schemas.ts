/**
 * Zod schemas + JSON responseSchema declarations for Gemini's structured output.
 *
 * The JSON schema is what we send to the Gemini API as `config.responseSchema`.
 * The Zod schema validates the output a SECOND time on our side — defence
 * against schema drift, partial responses, or models that quietly ignore the
 * constraint. (Hallucinated schema violations have been observed in 2025/2026
 * Flash models per multiple bug reports — the second-pass Zod is cheap insurance.)
 */
import { z } from "zod";
import { CRITERION_CODES } from "./types";

// ============ Pass 1 — Parse CV ============

/**
 * The parse pass is DESCRIPTIVE data — real CVs (and bluff CVs) omit fields,
 * and models emit null/missing for anything absent. Every field is lenient:
 * failing the whole parse over one null helps nobody (found by the VDK test
 * set — a no-companies CV crashed on `company: z.string()`).
 */
const lenientString = z
  .string()
  .nullish()
  .transform((v) => v ?? "");
const nullableString = z
  .string()
  .nullish()
  .transform((v) => v ?? null);
const lenientBool = z
  .boolean()
  .nullish()
  .transform((v) => v ?? false);

export const ParsedCvSchema = z.object({
  personal: z.object({
    full_name: nullableString,
    email: nullableString,
    phone: nullableString,
    location: nullableString,
    date_of_birth: nullableString,
  }),
  experience: z.array(
    z.object({
      company: lenientString,
      title: lenientString,
      start_date: nullableString,
      end_date: nullableString,
      is_current: lenientBool,
      description: nullableString,
      industry: nullableString,
    }),
  ),
  education: z.array(
    z.object({
      institution: lenientString,
      degree: nullableString,
      field: nullableString,
      start_date: nullableString,
      end_date: nullableString,
    }),
  ),
  skills: z.array(lenientString).catch([]),
  languages: z.array(
    z.object({
      name: lenientString,
      level: nullableString,
    }),
  ),
  certifications: z.array(
    z.object({
      name: lenientString,
      issuer: nullableString,
      year: nullableString,
    }),
  ),
  total_years_experience: z
    .number()
    .nullish()
    .transform((v) => v ?? null),
});

export type ParsedCvInput = z.infer<typeof ParsedCvSchema>;

/**
 * JSON schema sent to Gemini. Gemini's responseSchema dialect is a strict
 * subset of OpenAPI 3.0 — type strings, no $ref, nullable: true on optional
 * fields. nullable + required is an oddity in the dialect: Gemini wants the
 * field listed in `required` but the type to allow null.
 */
export const PARSE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    personal: {
      type: "object",
      properties: {
        full_name: { type: "string", nullable: true },
        email: { type: "string", nullable: true },
        phone: { type: "string", nullable: true },
        location: { type: "string", nullable: true },
        date_of_birth: { type: "string", nullable: true },
      },
      required: ["full_name", "email", "phone", "location", "date_of_birth"],
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          start_date: { type: "string", nullable: true },
          end_date: { type: "string", nullable: true },
          is_current: { type: "boolean" },
          description: { type: "string", nullable: true },
          industry: { type: "string", nullable: true },
        },
        required: [
          "company",
          "title",
          "start_date",
          "end_date",
          "is_current",
          "description",
          "industry",
        ],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: "string", nullable: true },
          field: { type: "string", nullable: true },
          start_date: { type: "string", nullable: true },
          end_date: { type: "string", nullable: true },
        },
        required: ["institution", "degree", "field", "start_date", "end_date"],
      },
    },
    skills: { type: "array", items: { type: "string" } },
    languages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          level: { type: "string", nullable: true },
        },
        required: ["name", "level"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string", nullable: true },
          year: { type: "string", nullable: true },
        },
        required: ["name", "issuer", "year"],
      },
    },
    total_years_experience: { type: "number", nullable: true },
  },
  required: [
    "personal",
    "experience",
    "education",
    "skills",
    "languages",
    "certifications",
    "total_years_experience",
  ],
} as const;

// ============ Pass 2 — Score CV ============

const CriterionResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasoning: z.string(),
  evidence_quotes: z.array(z.string()),
});

export const ScoreResultSchema = z.object({
  per_criterion: z.object({
    industry_fit: CriterionResultSchema,
    professional_skills: CriterionResultSchema,
    work_experience: CriterionResultSchema,
    years_experience: CriterionResultSchema,
    education: CriterionResultSchema,
    location: CriterionResultSchema,
  }),
  overall_summary: z.string(),
});

export type ScoreResultInput = z.infer<typeof ScoreResultSchema>;

const CRITERION_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    reasoning: { type: "string" },
    evidence_quotes: { type: "array", items: { type: "string" } },
  },
  required: ["score", "reasoning", "evidence_quotes"],
} as const;

export const SCORE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    per_criterion: {
      type: "object",
      properties: Object.fromEntries(CRITERION_CODES.map((k) => [k, CRITERION_SCHEMA])),
      required: [...CRITERION_CODES],
    },
    overall_summary: { type: "string" },
  },
  required: ["per_criterion", "overall_summary"],
} as const;
