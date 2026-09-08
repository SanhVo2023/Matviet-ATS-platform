import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { departments, positions, employees, users } from "@/db/schema";
import type { Tables } from "@/types/db";

export type DepartmentRow = Tables<"departments">;
export type PositionRow = Tables<"positions">;

export interface DepartmentWithMeta extends DepartmentRow {
  parent_name: string | null;
  head_name: string | null;
  employee_count: number;
  position_count: number;
}

/** Departments + parent/head names + live employee & position tallies (org page). */
export async function listDepartmentsWithMeta(): Promise<DepartmentWithMeta[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      parent_id: departments.parent_id,
      head_user_id: departments.head_user_id,
      created_at: departments.created_at,
      updated_at: departments.updated_at,
      head_name: users.name,
    })
    .from(departments)
    .leftJoin(users, eq(departments.head_user_id, users.id))
    .orderBy(asc(departments.name));

  const [empCounts, posCounts, deptNames] = await Promise.all([
    db
      .select({ department_id: employees.department_id, n: sql<number>`count(*)` })
      .from(employees)
      .groupBy(employees.department_id),
    db
      .select({ department_id: positions.department_id, n: sql<number>`count(*)` })
      .from(positions)
      .groupBy(positions.department_id),
    db.select({ id: departments.id, name: departments.name }).from(departments),
  ]);

  const empByDept = new Map(empCounts.map((r) => [r.department_id, Number(r.n)]));
  const posByDept = new Map(posCounts.map((r) => [r.department_id, Number(r.n)]));
  const nameById = new Map(deptNames.map((r) => [r.id, r.name]));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    parent_id: r.parent_id,
    head_user_id: r.head_user_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
    parent_name: r.parent_id ? (nameById.get(r.parent_id) ?? null) : null,
    head_name: r.head_name ?? null,
    employee_count: empByDept.get(r.id) ?? 0,
    position_count: posByDept.get(r.id) ?? 0,
  }));
}

export interface PositionWithDept extends PositionRow {
  department_name: string | null;
  employee_count: number;
}

export async function listPositions(): Promise<PositionWithDept[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: positions.id,
      title: positions.title,
      department_id: positions.department_id,
      created_at: positions.created_at,
      updated_at: positions.updated_at,
      department_name: departments.name,
    })
    .from(positions)
    .leftJoin(departments, eq(positions.department_id, departments.id))
    .orderBy(asc(positions.title));

  const counts = await db
    .select({ position_id: employees.position_id, n: sql<number>`count(*)` })
    .from(employees)
    .groupBy(employees.position_id);
  const byPos = new Map(counts.map((r) => [r.position_id, Number(r.n)]));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    department_id: r.department_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
    department_name: r.department_name ?? null,
    employee_count: byPos.get(r.id) ?? 0,
  }));
}

export async function getDepartment(id: string): Promise<DepartmentRow | null> {
  const db = await getDb();
  const rows = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Lightweight name/id pairs for select dropdowns. */
export interface DepartmentLite {
  id: string;
  name: string;
}
export async function listDepartmentOptions(): Promise<DepartmentLite[]> {
  const db = await getDb();
  return db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .orderBy(asc(departments.name));
}

export interface PositionLite {
  id: string;
  title: string;
  department_id: string | null;
}
export async function listPositionOptions(): Promise<PositionLite[]> {
  const db = await getDb();
  return db
    .select({ id: positions.id, title: positions.title, department_id: positions.department_id })
    .from(positions)
    .orderBy(asc(positions.title));
}

export interface UserOption {
  id: string;
  name: string;
}
/** Active users eligible to head a department (admin / hr / hiring_manager). */
export async function listHeadOptions(): Promise<UserOption[]> {
  const db = await getDb();
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.isActive, true), inArray(users.role, ["admin", "hr", "hiring_manager"])))
    .orderBy(asc(users.name));
}
