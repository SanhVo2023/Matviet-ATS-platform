# 0023 — HRM as the agentic system of engagement over Fastwork's system of record

**Date:** 2026-09-08
**Status:** Accepted (direction) — build phased H0–H6 per `docs/PRD-HRM.md`
**Decision-makers:** Sanh Võ (directive: grow the ATS into a full agentic HRM, integrate Fastwork) + Claude (design)
**Extends:** ADR 0012 (person-centric foundation), ADR 0020 (propose-first agents), ADR 0013 (Workers AI)

> **Scope refinement — same day (Sanh, 2026-09-08), applied to the PRD:**
> - **Fastwork integration is deferred** (no API access yet; Sanh working with HR). v1 is **self-contained on D1** and does not depend on Fastwork. The integration seam (design point 4) stands as the design for the later **D-FW** train, not a v1 dependency.
> - **Mắt Việt is part of EssilorLuxottica**; employees already use a corporate **"personal desk"** (ESS) for **payslip viewing + OKR upload**. That is a third system boundary — we do **not** rebuild payslip or OKR.
> - **OKR/KPI/performance is out of v1** — the current manual, **unverified** scoring (affects only year-end bonus) is left as-is pending **BOD confirmation**. The verification gap is a recorded future opportunity, not v1 work.
> The core decision below (system of engagement over system of record; single-writer-per-domain; person-centric expansion; EmployeeAgent DO; propose-first) is unchanged — only the sequencing and the v1 boundary shifted.

## Context

Sanh's directive (2026-09-08): turn the app into a **full-function HRM** for Mắt Việt, with the existing **ATS as one module**, built on the **same agentic, propose-first philosophy** (ADR 0020) behind a **traditional HRM UI**, and **integrated with Fastwork** — the Vietnamese platform Mắt Việt already runs.

Two facts shape the decision:

1. **The foundation is already laid.** ADR 0012 made the app person-centric (`people` anchor; `candidates.person_id`; reserved `employees`/`departments`/`positions`; `src/lib/modules.ts` already declares `employees`/`org`/`leave` dark). Extending the lifecycle is a *pure addition*, not a rewrite.
2. **Fastwork already owns the hardest, most entrenched HR functions.** Its HRM+ suite runs **chấm công** (FaceID/GPS timesheet — physical hardware across stores) and **tính lương** (payroll — a legal record). Rebuilding either would be expensive, legally fraught, and duplicative. Fastwork exposes a **permission-gated company "API code"** with bi-directional sync but **no public REST/webhook docs** — integration is real but must be defensive.

## Decision

1. **Position the app as the agentic *system of engagement* — the employee-lifecycle brain — over Fastwork's *system of record* for time & money.** We own hire → onboard → manage → develop → offboard **and the person master, org, and all HR decisions**. Fastwork remains authoritative for **attendance and payroll**. We do **not** rebuild timesheet capture or payroll computation.

2. **Single writer per domain.** Every shared field has one authoritative system; the other reads. **Conflict rule: Fastwork wins time+money; we win lifecycle+org+master.** This eliminates sync loops and "which number is right." Each employee resolves to one `person_id` spanning candidate → employee → alumnus.

3. **Same agentic model, generalized.** The ATS "Hôm nay" feed becomes an **HR command feed** across all modules. Each module ships agent(s) that emit fully-prepared, propose-first proposals; **approval runs the same server service a manual action would** (`via:'agent_proposal'`). **EmployeeAgent DO per employee** holds lifecycle timers (probation, contract, review, license, anniversary), alarm → `SELF` → `/api/agent/sweep`; DO holds no business logic and never reads D1 (ADR 0020). Autonomy stays **propose-first** — anything touching money, legal status, or an external record is **always** human-approved.

4. **Defensive Fastwork integration.** A `src/server/integrations/fastwork/` adapter interface with **two implementations** — `api` (permission-gated company API code, a secret) and `csv` (manual export/import fallback) — chosen by config flag, mirroring the ATS TopCV *Phase A → Phase B* pattern and the `email/transport.ts` seam. **Push** (new hire, master change, approved leave, salary change, termination) is queue-backed + retried; **pull** (attendance nightly, payslip refs, optional KPI) is cron-scheduled + reconciled. `people`/`employees` gain `fastwork_id`. A **Fastwork discovery task gates H1**; until confirmed, H1 ships on CSV so the roadmap never blocks on the vendor.

## Explicitly NOT decided here (deferred to per-phase ADRs)

Payroll computation, attendance capture, wholesale Fastwork replacement, full LMS, native mobile app, multi-language, government-portal filing automation, dark mode — all out (see PRD §6). Store/location modeling, leave/KPI ownership split, and asset ownership are **open questions** (PRD §14) resolved at their build phase.

## Consequences

- The ATS is reframed as the **Recruiting module**; `hired` now triggers onboarding instead of ending the flow.
- New guardrail alongside the existing ones (never touch Google MX zone; secrets via `wrangler secret`): **never auto-execute a Fastwork write or a legal/comp/termination action without a human tap.**
- The biggest program risk (undocumented Fastwork API) is retired early and cheaply via the CSV fallback + discovery gate.
- Full lifecycle history from first CV to last working day lives under one `person_id`, zero migration — the payoff ADR 0012 was designed for.
