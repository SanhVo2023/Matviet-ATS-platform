# server/leave (HRM H2)

Leave requests + approval, with the agentic decision card on the "Hôm nay" feed.
Balances are **computed**, not stored (avoids accrual drift).

- `util.ts` — pure math (unit-tested): `inclusiveDays`, `yearsOfService`,
  `annualLeaveEntitlement` (12 + 1/5yrs, Bộ luật LĐ 2019), `rangesOverlap`.
- `repository.ts` — `listLeaveRequests` (dept-scopable), `getLeaveRequest`,
  `listLeaveForEmployee`, `leaveBalanceForEmployee` (entitlement − approved annual
  this year), `teamCoverageOverlap` (agent reasoning input).
- `service.ts` — `createLeaveRequest` (inserts pending + proposes the decision on
  the feed with balance + coverage reasoning), `decideLeave` (approve/reject +
  supersede the feed card), `cancelLeave`.

The `leave_request` proposal is approved either on the feed (Duyệt → `decideLeave`
via `employee-agent/execute.ts`) or on `/nghi-phep` — both supersede the card by
its `lv:<id>` dedupe key. Manager scope: `/nghi-phep` shows a hiring_manager only
their department's requests (`users.departmentId` = `employees.department_id`).

**Deferred (D-ESS):** employee self-service accounts + mobile submission — needs a
decision on how ~200 staff authenticate (email / phone / EssilorLuxottica SSO).
Today HR/managers log leave on behalf of employees.
