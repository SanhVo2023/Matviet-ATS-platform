# 0013 — Workers AI replaces Gemini; AI features everywhere + staff agent

**Date:** 2026-07-03
**Status:** Accepted
**Decision-makers:** Sanh Võ (directive) + Claude (design)

## Context

Gemini API calls from the production Worker fail: Google geo-blocks requests based on egress IP, and Cloudflare Workers give no control over egress region. Sanh also asked for richer AI across the app and an agent that performs tasks for staff.

## Decision

**Workers AI** (`env.AI` binding) replaces Gemini entirely — inference runs on the same platform as the app, so geo-blocking is structurally impossible.

**Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`** (env-swappable via `AI_MODEL`):
- The strongest Workers AI model with **confirmed** `json_schema` structured output **and** function calling — both hard requirements (scoring + agent tools).
- 70B-class multilingual instruct quality is sufficient for extraction, rubric scoring, Vietnamese drafting; the evidence-verification layer guards hallucinated quotes.
- Pricing $0.293/M in + $2.253/M out ⇒ ≈ $0.005 per CV scoring, ≈ $0.25/month at our 50 CVs/month, largely inside the free 10k neurons/day. Rate limit 300 req/min (default text-gen) vs our worst case of ~10 concurrent jobs — no constraint.
- Upgrade path if quality ever disappoints: flip `AI_MODEL` to `@cf/openai/gpt-oss-120b` (cheaper output, high reasoning — JSON-mode support unconfirmed in docs, verify first) or Kimi K2.7.

**Pipeline change:** Workers AI takes text, not PDFs. CV text is extracted in-Worker via `unpdf` before pass 1. **Net upgrade:** evidence quotes now verify against the CV's *actual* text rather than an AI-synthesized reconstruction. Trade-off: scanned (image-only) PDFs fail with a clear non-retriable Vietnamese error → manual scoring path (previously Gemini could OCR them). Acceptable: TopCV/CareerViet exports are digital.

**Provider seam:** `src/lib/ai/workers-ai.ts` — `aiChat` (prose), `aiJson` (schema mode + Zod second-pass + one corrective retry), `aiWithTools` (function-calling loop). Nothing else in the app touches `env.AI` directly.

**AI features shipped on the seam:**
1. CV parse + 2-pass scoring (ported).
2. JD generation in the job form.
3. Email drafting in the composer.
4. Interview question generator (from real CV text + job requirements).
5. Candidate AI summary.
6. **Staff agent** ("Trợ lý Mắt Việt HR") — floating chat, admin/HR only, with tools: search/get candidates, pipeline summary, today's interviews, move stage, schedule interview (real Outlook event), start approval, draft email. Safety: tools are the same guarded service functions the UI calls; **agent emails always land as `pending_approval` drafts** — the agent can never send outward communication directly; ambiguous names force a clarifying question.

## Consequences

- `@google/genai` and `GEMINI_*` secrets retired; `src/lib/ai/gemini/` keeps only the provider-agnostic prompts/schemas/types (naming is historical).
- JSON mode caveat: model-side schema compliance is best-effort → the Zod second-pass with corrective retry is the contract; final failure is classified non-retriable ("Schema…") exactly like the Gemini flow.
- `wrangler dev` AI calls run REMOTELY (billed, needs auth) even in local mode — local tests hit the real model.
- Cost guardrails from the locked defaults (Gemini $5/day soft alert) carry over conceptually; Workers AI spend is visible in the Cloudflare dashboard and bounded by the same tiny volume.
