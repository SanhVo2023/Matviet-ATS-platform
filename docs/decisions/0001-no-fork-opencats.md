# 0001 — Build greenfield, do not fork OpenCATS

**Date:** 2026-04-21
**Status:** Accepted
**Decision-makers:** Sanh Võ + Claude

## Context

We need an internal-HR ATS for Mắt Việt. Open-source ATS options exist (notably OpenCATS, also OrangeHRM, Frappe HR, FreeATS, SpotAxis). Forking could potentially save development time vs greenfield Next.js + Supabase build.

## Decision

**Build greenfield in Next.js 15 + Supabase.** Do not fork any open-source ATS.

## Alternatives considered

- **OpenCATS** — PHP 7.2 era + MySQL only + Smarty templates + jQuery. GPLv2 (forces source distribution to client). 5 of 11 FRs missing entirely (AI scoring, calendar, email automation, approval workflow, assessments). Zero Vietnamese support. Modification cost estimated ~16 weeks vs 8 weeks greenfield. Active but slow-moving project (~667 stars, ~1 known production deployment).
- **OrangeHRM open edition** — PHP backend + React frontend; OSL 3.0 + commercial dual license; ~35% effort to extract recruitment APIs.
- **Frappe HR** — Python (Frappe framework); GPLv3; production-ready but contradicts our stack and would lose Supabase RLS / MS Graph integration.
- **FreeATS** — Ruby on Rails. Wrong stack.
- **SpotAxis** — 20 GitHub stars, early-stage, underspecified.
- **swarajkumarsingh/ats-project** — Python tutorial-grade Gemini + Calendar; reference value only.
- **No-code platforms (Budibase, Appsmith, ToolJet)** — internal-tools UX, not recruiter-grade; custom Gemini + MS Graph adds back all the work.

## Consequences

- **Pro:** No legacy debt, no GPL source-distribution obligation, full IP for Mắt Việt, stack alignment with Sanh's tooling, Vietnamese-first from day 1.
- **Con:** Greenfield build is ~8 weeks; we can't reuse OpenCATS' admin UI for jobs/candidates.
- AI scoring is the differentiator — every fork target was missing it entirely; we'd build Gemini integration from scratch on either path.

## References

- Master plan APPENDIX C (full evaluation matrix)
- [OpenCATS GitHub](https://github.com/opencats/OpenCATS)
- [Reqcore 2026 ATS comparison](https://reqcore.com/blog/best-open-source-applicant-tracking-systems)
