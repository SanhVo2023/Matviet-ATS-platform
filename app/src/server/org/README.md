# server/org (HRM H0)

Organisation structure — `departments` (tree via `parent_id`, optional `head_user_id`)
and `positions` (title catalog, optional `department_id`). First consumer of the ADR 0012
foundation; also feeds job metadata and employee assignment.

## Files

- `repository.ts` — `listDepartmentsWithMeta` (parent/head names + live employee &
  position tallies), `listPositions` (with department name + headcount),
  `getDepartment`, and lightweight `listDepartmentOptions` / `listPositionOptions`
  for select dropdowns.
- `service.ts` — `create/update/deleteDepartment`, `create/update/deletePosition`.
  Deletes are **guarded**: a department with employees, positions, or child departments
  cannot be deleted; a position still held by an employee cannot be deleted.

Positions are also auto-created from job titles during candidate → employee conversion
(`server/employees/service.ts findOrCreatePosition`), so the catalog grows from real hires.
