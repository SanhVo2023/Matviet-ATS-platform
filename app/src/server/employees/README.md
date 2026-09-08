# server/employees (HRM H0)

Employee records — the person-centric core (ADR 0012) activated. An employee is a
`people` master (identity, survives candidate → employee → alumnus) plus an
`employees` row (employment context: department, position, manager, store, status,
type, dates, bank, emergency contact).

## Files

- `repository.ts` — reads: `listEmployees(filters)` (joined person/department/position
  - resolved manager names), `getEmployeeDetail(id)`, `getEmployeeByPerson`,
    `getEmployeeBySourceCandidate`, `listManagerOptions`.
- `service.ts` — writes: `createEmployeeManual`, `updateEmployee` (updates the linked
  `people` master + the `employees` row atomically), `setEmployeeStatus`,
  `generateEmployeeCode` (`MV####`), and **`ensureEmployeeForCandidate`** — the
  idempotent candidate → employee conversion.

## Conversion (ATS ↔ HRM seam)

`ensureEmployeeForCandidate(candidateId)` is called automatically when a candidate
reaches `hired` (from `ung-vien/actions.ts changeStageAction`), and is available as a
manual backfill action. It reuses the candidate's `person_id` (zero-migration history),
copies department from the job, find-or-creates a position from the job title, starts the
employee on `probation`, and links `source_candidate_id` for lineage. Idempotent: a
second call returns the existing employee (matched by `source_candidate_id`, then by a
live employee for the same person).

## Not here

Onboarding packets, probation/contract clocks (H1), leave (H2), offboarding (H3),
payroll/attendance (Fastwork — deferred, see `docs/PRD-HRM.md`).
