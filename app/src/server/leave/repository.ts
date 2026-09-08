import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { leave_requests, employees, people, departments } from "@/db/schema";
import { annualLeaveEntitlement, rangesOverlap } from "./util";
import type { Database, Tables } from "@/types/db";

export type LeaveRequestRow = Tables<"leave_requests">;
export type LeaveStatus = Database["public"]["Enums"]["leave_status"];

export interface LeaveListItem extends LeaveRequestRow {
  employee_name: string;
  department_id: string | null;
  department_name: string | null;
}

export interface LeaveListFilters {
  status?: LeaveStatus | "all";
  department_id?: string | null;
}

export async function listLeaveRequests(filters: LeaveListFilters = {}): Promise<LeaveListItem[]> {
  const db = await getDb();
  const conds = [];
  if (filters.status && filters.status !== "all")
    conds.push(eq(leave_requests.status, filters.status));
  if (filters.department_id) conds.push(eq(employees.department_id, filters.department_id));

  const rows = await db
    .select({
      req: leave_requests,
      employee_name: people.full_name,
      department_id: employees.department_id,
      department_name: departments.name,
    })
    .from(leave_requests)
    .innerJoin(employees, eq(leave_requests.employee_id, employees.id))
    .innerJoin(people, eq(employees.person_id, people.id))
    .leftJoin(departments, eq(employees.department_id, departments.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(leave_requests.created_at));

  return rows.map((r) => ({
    ...r.req,
    employee_name: r.employee_name,
    department_id: r.department_id,
    department_name: r.department_name ?? null,
  }));
}

export async function getLeaveRequest(id: string): Promise<LeaveRequestRow | null> {
  const db = await getDb();
  const rows = await db.select().from(leave_requests).where(eq(leave_requests.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listLeaveForEmployee(employeeId: string): Promise<LeaveRequestRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(leave_requests)
    .where(eq(leave_requests.employee_id, employeeId))
    .orderBy(desc(leave_requests.start_date));
}

export interface LeaveBalance {
  entitlement: number;
  used: number;
  remaining: number;
}

/** Annual-leave balance for the current year: entitlement − approved annual days. */
export async function leaveBalanceForEmployee(employeeId: string): Promise<LeaveBalance> {
  const db = await getDb();
  const emp = await db
    .select({ start_date: employees.start_date, hired_at: employees.hired_at })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const nowIso = new Date().toISOString().slice(0, 10);
  const entitlement = annualLeaveEntitlement(emp?.start_date ?? emp?.hired_at ?? null, nowIso);

  const year = new Date().getUTCFullYear();
  const used = await db
    .select({ total: sql<number>`coalesce(sum(${leave_requests.days}), 0)` })
    .from(leave_requests)
    .where(
      and(
        eq(leave_requests.employee_id, employeeId),
        eq(leave_requests.type, "annual"),
        eq(leave_requests.status, "approved"),
        sql`substr(${leave_requests.start_date}, 1, 4) = ${String(year)}`,
      ),
    )
    .then((r) => Number(r[0]?.total ?? 0));

  return { entitlement, used, remaining: entitlement - used };
}

/**
 * How many OTHER employees in the same department have approved leave
 * overlapping [start, end] — powers the agent's coverage reasoning.
 */
export async function teamCoverageOverlap(
  employeeId: string,
  startIso: string,
  endIso: string,
): Promise<number> {
  const db = await getDb();
  const emp = await db
    .select({ department_id: employees.department_id })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!emp?.department_id) return 0;

  const rows = await db
    .select({
      id: leave_requests.id,
      employee_id: leave_requests.employee_id,
      start_date: leave_requests.start_date,
      end_date: leave_requests.end_date,
    })
    .from(leave_requests)
    .innerJoin(employees, eq(leave_requests.employee_id, employees.id))
    .where(
      and(eq(employees.department_id, emp.department_id), eq(leave_requests.status, "approved")),
    );

  return rows.filter(
    (r) =>
      r.employee_id !== employeeId && rangesOverlap(startIso, endIso, r.start_date, r.end_date),
  ).length;
}
