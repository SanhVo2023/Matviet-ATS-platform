import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { offboarding_tasks, employees } from "@/db/schema";
import type { Tables } from "@/types/db";

export type OffboardingTaskRow = Tables<"offboarding_tasks">;

/** Default exit checklist for a Mắt Việt departure. */
export const OFFBOARDING_TEMPLATE: { title: string; category: string }[] = [
  { title: "Bàn giao công việc & tài liệu", category: "handover" },
  { title: "Thu hồi tài sản (đồng phục, thẻ, thiết bị)", category: "assets" },
  { title: "Khóa tài khoản chấm công & hệ thống", category: "assets" },
  { title: "Chốt sổ BHXH", category: "compliance" },
  { title: "Tính lương & trợ cấp thôi việc", category: "payroll" },
  { title: "Phỏng vấn nghỉ việc (exit interview)", category: "hr" },
];

export async function listOffboardingTasks(employeeId: string): Promise<OffboardingTaskRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(offboarding_tasks)
    .where(eq(offboarding_tasks.employee_id, employeeId))
    .orderBy(asc(offboarding_tasks.sort_order), asc(offboarding_tasks.created_at));
}

/**
 * Start a departure: record the last working day + reason on the employee and
 * seed the exit checklist (idempotent — checklist seeded once). Status stays
 * until `finalizeOffboarding` so the person is still counted as employed.
 */
export async function startOffboarding(
  employeeId: string,
  opts: { lastDay?: string | null; reason?: string | null },
): Promise<void> {
  const db = await getDb();
  await db
    .update(employees)
    .set({
      last_working_day: opts.lastDay?.trim() || null,
      termination_reason: opts.reason?.trim() || null,
    })
    .where(eq(employees.id, employeeId));

  const existing = await db
    .select({ id: offboarding_tasks.id })
    .from(offboarding_tasks)
    .where(eq(offboarding_tasks.employee_id, employeeId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!existing) {
    await db.insert(offboarding_tasks).values(
      OFFBOARDING_TEMPLATE.map((task, i) => ({
        employee_id: employeeId,
        title: task.title,
        category: task.category,
        sort_order: i,
      })),
    );
  }
}

/** Finalize: mark the employee terminated (they leave the active headcount). */
export async function finalizeOffboarding(employeeId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(employees)
    .set({ status: "terminated", terminated_at: new Date().toISOString() })
    .where(eq(employees.id, employeeId));
}

export async function addOffboardingTask(employeeId: string, title: string): Promise<void> {
  const t = title.trim();
  if (!t) throw new Error("Nội dung việc không được để trống.");
  const db = await getDb();
  await db.insert(offboarding_tasks).values({ employee_id: employeeId, title: t, sort_order: 999 });
}

export async function toggleOffboardingTask(
  id: string,
  done: boolean,
  actorId: string | null,
): Promise<void> {
  const db = await getDb();
  await db
    .update(offboarding_tasks)
    .set({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? actorId : null })
    .where(eq(offboarding_tasks.id, id));
}

export async function removeOffboardingTask(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(offboarding_tasks).where(eq(offboarding_tasks.id, id));
}
