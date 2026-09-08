# server/offboarding (HRM H3)

Departure workflow — closes the employee lifecycle.

- `startOffboarding(employeeId, {lastDay, reason})` — records the last working day
  - reason on the employee and seeds the exit checklist from `OFFBOARDING_TEMPLATE`
    (idempotent). Status stays until finalized, so the person is still counted in
    headcount.
- `finalizeOffboarding(employeeId)` — sets status `terminated` + `terminated_at`
  (leaves active headcount; retained as alumnus on the same `person_id`, ADR 0012).
- `listOffboardingTasks`, `add/toggle/removeOffboardingTask` — checklist ops.

HR-initiated (no agent proposal). Surfaced as `OffboardingCard` on the employee
profile. Departure counts feed the HR analytics (`employeeHeadcountStats`).
