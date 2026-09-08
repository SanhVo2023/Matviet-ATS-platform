# server/onboarding (HRM H1)

New-hire onboarding checklist. Seeded from `ONBOARDING_TEMPLATE` (Vietnamese
optical-retail defaults) when the onboarding-packet proposal is approved; HR ticks
items off on the employee profile.

- `repository.ts` — `listTasksForEmployee`, `onboardingProgress`.
- `service.ts` — `seedOnboardingTasks(db, employeeId)` (idempotent), `addOnboardingTask`,
  `toggleOnboardingTask`, `removeOnboardingTask`.
