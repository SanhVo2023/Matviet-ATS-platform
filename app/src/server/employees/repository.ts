import "server-only";
import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { getDb } from "@/db";
import { employees, people, departments, positions } from "@/db/schema";
import type { Database, Tables } from "@/types/db";

export type EmployeeRow = Tables<"employees">;
export type PersonRow = Tables<"people">;
export type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

export interface EmployeeListItem {
  id: string;
  employee_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: EmployeeStatus;
  employment_type: Database["public"]["Enums"]["employment_type"];
  store_location: string | null;
  department_id: string | null;
  department_name: string | null;
  position_id: string | null;
  position_title: string | null;
  manager_id: string | null;
  manager_name: string | null;
  hired_at: string | null;
  start_date: string | null;
}

export interface EmployeeListFilters {
  status?: EmployeeStatus | "all";
  department_id?: string | null;
  search?: string;
}

export async function listEmployees(
  filters: EmployeeListFilters = {},
): Promise<EmployeeListItem[]> {
  const db = await getDb();
  const conds = [];
  if (filters.status && filters.status !== "all") conds.push(eq(employees.status, filters.status));
  if (filters.department_id) conds.push(eq(employees.department_id, filters.department_id));
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    conds.push(
      or(like(people.full_name, q), like(employees.employee_code, q), like(people.email, q)),
    );
  }

  const rows = await db
    .select({
      id: employees.id,
      employee_code: employees.employee_code,
      full_name: people.full_name,
      email: people.email,
      phone: people.phone,
      status: employees.status,
      employment_type: employees.employment_type,
      store_location: employees.store_location,
      department_id: employees.department_id,
      department_name: departments.name,
      position_id: employees.position_id,
      position_title: positions.title,
      manager_id: employees.manager_id,
      hired_at: employees.hired_at,
      start_date: employees.start_date,
    })
    .from(employees)
    .innerJoin(people, eq(employees.person_id, people.id))
    .leftJoin(departments, eq(employees.department_id, departments.id))
    .leftJoin(positions, eq(employees.position_id, positions.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(employees.created_at));

  // Resolve manager display names (manager_id → employee → person) in one pass.
  const managerIds = [...new Set(rows.map((r) => r.manager_id).filter((x): x is string => !!x))];
  const managerNames = new Map<string, string>();
  if (managerIds.length) {
    const mgrs = await db
      .select({ id: employees.id, name: people.full_name })
      .from(employees)
      .innerJoin(people, eq(employees.person_id, people.id))
      .where(inArray(employees.id, managerIds));
    for (const m of mgrs) managerNames.set(m.id, m.name);
  }

  return rows.map((r) => ({
    ...r,
    manager_name: r.manager_id ? (managerNames.get(r.manager_id) ?? null) : null,
  }));
}

export interface EmployeeDetail {
  employee: EmployeeRow;
  person: PersonRow;
  department_name: string | null;
  position_title: string | null;
  manager_name: string | null;
}

export async function getEmployeeDetail(id: string): Promise<EmployeeDetail | null> {
  const db = await getDb();
  const rows = await db
    .select({ employee: employees, person: people })
    .from(employees)
    .innerJoin(people, eq(employees.person_id, people.id))
    .where(eq(employees.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const [dept, pos, mgr] = await Promise.all([
    row.employee.department_id
      ? db
          .select({ name: departments.name })
          .from(departments)
          .where(eq(departments.id, row.employee.department_id))
          .limit(1)
          .then((r) => r[0]?.name ?? null)
      : Promise.resolve(null),
    row.employee.position_id
      ? db
          .select({ title: positions.title })
          .from(positions)
          .where(eq(positions.id, row.employee.position_id))
          .limit(1)
          .then((r) => r[0]?.title ?? null)
      : Promise.resolve(null),
    row.employee.manager_id
      ? db
          .select({ name: people.full_name })
          .from(employees)
          .innerJoin(people, eq(employees.person_id, people.id))
          .where(eq(employees.id, row.employee.manager_id))
          .limit(1)
          .then((r) => r[0]?.name ?? null)
      : Promise.resolve(null),
  ]);

  return {
    employee: row.employee,
    person: row.person,
    department_name: dept,
    position_title: pos,
    manager_name: mgr,
  };
}

/** Existing employee for a person, optionally excluding terminated (idempotent conversion). */
export async function getEmployeeByPerson(
  personId: string,
  opts: { excludeTerminated?: boolean } = {},
): Promise<EmployeeRow | null> {
  const db = await getDb();
  const conds = [eq(employees.person_id, personId)];
  const rows = await db
    .select()
    .from(employees)
    .where(and(...conds))
    .orderBy(desc(employees.created_at));
  const list = opts.excludeTerminated ? rows.filter((r) => r.status !== "terminated") : rows;
  return list[0] ?? null;
}

export async function getEmployeeBySourceCandidate(
  candidateId: string,
): Promise<EmployeeRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(employees)
    .where(eq(employees.source_candidate_id, candidateId))
    .limit(1);
  return rows[0] ?? null;
}

export interface ManagerOption {
  id: string;
  name: string;
}
/** Active/probation employees eligible to be a direct manager (dropdown). */
export async function listManagerOptions(): Promise<ManagerOption[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: employees.id, name: people.full_name })
    .from(employees)
    .innerJoin(people, eq(employees.person_id, people.id))
    .where(inArray(employees.status, ["probation", "active", "on_leave"]))
    .orderBy(asc(people.full_name));
  return rows;
}

export interface EmployeeOption {
  id: string;
  name: string;
  department_id: string | null;
}
/** Non-terminated employees for pickers (e.g. leave request on behalf). */
export async function listEmployeeOptions(departmentId?: string | null): Promise<EmployeeOption[]> {
  const db = await getDb();
  const conds = [inArray(employees.status, ["probation", "active", "on_leave"])];
  if (departmentId) conds.push(eq(employees.department_id, departmentId));
  const rows = await db
    .select({ id: employees.id, name: people.full_name, department_id: employees.department_id })
    .from(employees)
    .innerJoin(people, eq(employees.person_id, people.id))
    .where(and(...conds))
    .orderBy(asc(people.full_name));
  return rows;
}
