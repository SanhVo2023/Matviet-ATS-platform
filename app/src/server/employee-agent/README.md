# server/employee-agent (HRM H1)

Employee-lifecycle agent — propose-first (ADR 0020), extended to employees. Reuses
the `agent_proposals` table (via `employee_id`) and the same "Hôm nay" feed as hiring;
no per-employee Durable Object (date-based clocks are swept nightly, simpler + robust
at ~200 staff).

## Flow

1. **generators.ts** — `proposeOnboardingPacket` / `proposeProbationReview` /
   `proposeContractRenewal` build fully-formed cards via `agent-flows/repository`
   `createProposal({ employeeId, … })`. Dedupe prefix `ep:`.
2. **sweep.ts** — `sweepEmployeeCompliance()` scans active dated contracts and emits
   probation-review (thử việc within 7d) + contract-renewal (fixed-term within 30d).
   Pure `classifyContractClock` is unit-tested. Driven nightly by `custom-worker.ts`
   (`/api/employee/sweep`, 01:00 UTC gate).
3. **execute.ts** — `executeEmployeeProposal` runs the approve tap through the same
   services a manual action uses: onboarding_packet → seed tasks + probation contract;
   probation_review → status `active` + end probation contract; contract_renewal →
   create a 12-month renewal + expire the old one. Wired into `agent-flows/execute.ts`
   `executeByKind`.

Onboarding packets are proposed on candidate → employee conversion
(`server/employees/service.ts ensureEmployeeForCandidate`).
