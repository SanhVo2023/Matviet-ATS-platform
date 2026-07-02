# 0012 — Foundation for the all-in employee management system

**Date:** 2026-07-02
**Status:** Accepted (foundation only — build deferred)
**Decision-makers:** Sanh Võ (directive: "lay the foundation, don't build it") + Claude (design)

## Context

The app must grow from an ATS into an all-in employee management system (HRIS): employee records, departments, contracts, leave, reviews. Today a "candidate" is the atom; in an HRIS the atom is a **person** whose relationship with the company changes over time (candidate → employee → alumnus).

## Decision

Lay three foundations in the D1 schema and module architecture **now**, build the HRIS features **later**:

1. **Person-centric core.** New `people` table (id, full_name, email, phone, national_id nullable, dob nullable) as the identity anchor. `candidates` gains a `person_id` FK; the hiring flow creates/links a person on candidate creation (dedup by normalized email/phone). When someone is hired, the future `employees` row references the same `person_id` — full history from first CV to last working day with zero data migration.
2. **Reserved HRIS tables, minimal columns.** `departments` (id, name, parent_id), `positions` (id, title, department_id), `employees` (id, person_id, employee_code, department_id, position_id, hired_at, status). Created in the initial D1 migration so future modules add columns, not restructure. The ATS writes only `people`; the HRIS tables stay empty until we build on them.
3. **Module registry.** `src/server/<module>` stays the unit of growth (recruiting modules today; `employees`, `leave`, `contracts` later). Sidebar navigation is generated from a `MODULES` registry in `src/lib/modules.ts` with per-role visibility and an `enabled` flag — future modules ship dark and flip on.

## Explicitly deferred (do NOT build yet)

Employee profile UI, org chart, contracts, leave/attendance, payroll integration, employee self-service portal, candidate→employee conversion flow. Each will get its own ADR + build group when Sanh green-lights.

## Consequences

- Hiring pipeline pays a tiny tax now (person upsert on candidate create) to make the HRIS a pure addition later.
- `departments`/`positions` can immediately serve as job metadata (a job posting belongs to a department) — first consumer of the foundation.
- 10 GB D1 ceiling is generous for an HRIS of a ~200-person retail chain; if attachments grow, they live in R2 anyway.
