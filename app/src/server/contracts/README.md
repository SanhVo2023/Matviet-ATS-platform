# server/contracts (HRM H1)

Labor contracts per Bộ luật Lao động 2019. Probation is modeled as a `thu_viec`
contract whose `end_date` is the probation clock; fixed-term is `xac_dinh_thoi_han`;
indefinite is `khong_xac_dinh_thoi_han` (never carries an end_date).

- `repository.ts` — `listContractsForEmployee`, `getContract`, and
  `listActiveContractsEndingBefore(iso)` — the compliance sweep's source for
  probation-review + contract-renewal proposals.
- `service.ts` — `create/update/end/deleteContract`; `seedProbationContract(db, …)`
  (idempotent 60-day probation contract, used by the onboarding-packet execution).

Renewal + probation-pass are executed via the employee-agent proposals
(`server/employee-agent/execute.ts`), which call this service.
