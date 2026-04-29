// Zod + Gemini responseSchema declarations. Mirror of
// app/src/lib/ai/gemini/schemas.ts (kept in sync; Deno-compatible imports).

import { z } from "zod";
import { CRITERION_CODES } from "./types.ts";

// ============ Pass 1 — Parse CV ============

export const ParsedCvSchema = z.object({
  personal: z.object({
    full_name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    date_of_birth: z.string().nullable(),
  }),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
      is_current: z.boolean(),
      description: z.string().nullable(),
      industry: z.string().nullable(),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable(),
      field: z.string().nullable(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
    }),
  ),
  skills: z.array(z.string()),
  languages: z.array(
    z.object({
      name: z.string(),
      level: z.string().nullable(),
    }),
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable(),
      year: z.string().nullable(),
    }),
  ),
  total_years_experience: z.number().nullable(),
});

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
};

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

const CRITERION_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    reasoning: { type: "string" },
    evidence_quotes: { type: "array", items: { type: "string" } },
  },
  required: ["score", "reasoning", "evidence_quotes"],
};

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
};
