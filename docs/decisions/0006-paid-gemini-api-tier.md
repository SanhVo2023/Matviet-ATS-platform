# 0006 — Paid Gemini API tier (not Vertex AI, not free tier)

**Date:** 2026-04-21
**Status:** Accepted
**Decision-makers:** Sanh Võ + Claude

## Context

Vietnamese candidate CVs contain PII (full name, phone, address, photo, date of birth). We need an LLM provider that:
1. Doesn't use input data to train models
2. Doesn't expose data to human reviewers
3. Has acceptable retention policies
4. Is cost-effective at our scale (~50 CVs/month)

## Decision

**Use Google Gemini 2.5 Flash via the standard Gemini API on the PAID tier** (`ai.google.dev` with billing enabled).

## Alternatives considered

- **Free tier Gemini API** — cheaper but per Google's terms, free-tier inputs/outputs MAY be used to improve models AND are subject to human review. Unsuitable for PII. Rejected.
- **Vertex AI / Gemini for Google Cloud** — stronger data governance (no training, no human review, region pinning, enterprise SLAs). Rejected for v1 due to (a) more complex setup (service accounts, IAM), (b) different billing arrangement, (c) Vertex SDK differs slightly from `@google/genai`. Worth migrating IF compliance requirements escalate.
- **OpenAI GPT-4o** — feasible alternative; rejected because Vietnamese performance on Gemini tested better in our research, and Gemini's structured-output (`responseSchema`) is more mature.
- **Anthropic Claude API** — comparable quality but our stack is settled on Gemini for native PDF input + responseSchema.
- **Strip PII pre-Gemini** — earlier discussion rejected this. User decision: feed raw CV.

## Consequences

- **Pro:**
  - Per Google's Gemini API Terms (paid tier): inputs/outputs NOT used to train, NO human review, retention per published windows only
  - Native PDF input (no pre-extraction needed; matches our DOCX→PDF→Gemini pipeline)
  - `responseSchema` for guaranteed JSON structure
  - Cheap at our scale (~$0.09/month for 50 CVs)
- **Con:**
  - Standard Gemini API is global; Vertex AI offers region pinning we don't get
  - If Mắt Việt's compliance officer escalates beyond ToS guarantees, we'd have to migrate to Vertex (estimated 1-week refactor)
- **Mitigation:** abstract Gemini calls behind `src/lib/ai/gemini/client.ts` so swap to Vertex SDK is contained

## Privacy posture documented

Privacy notice (`docs/privacy-notice-vi.md`) explicitly states:
- AI vendor (Google Gemini, paid tier)
- Data not used for training
- Data not subject to human review
- Retention policy
- Candidate's right to request deletion

## Cost guardrails

- Soft alert: $5/day (email Sanh)
- Hard cap: $25/day (circuit-break scoring queue; banner)
- Implementation: `cost_meters` table + scheduled function

## References

- [Gemini API Terms (paid tier)](https://ai.google.dev/gemini-api/terms)
- [Data Privacy Guide 2025](https://redact.dev/blog/gemini-api-terms-2025)
- ADR-0007 (no File Search / pgvector — privacy concern was a key factor)
