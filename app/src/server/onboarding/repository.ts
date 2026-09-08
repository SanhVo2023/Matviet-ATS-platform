import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { onboarding_tasks } from "@/db/schema";
import type { Tables } from "@/types/db";

export type OnboardingTaskRow = Tables<"onboarding_tasks">;

export async function listTasksForEmployee(employeeId: string): Promise<OnboardingTaskRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(onboarding_tasks)
    .where(eq(onboarding_tasks.employee_id, employeeId))
    .orderBy(asc(onboarding_tasks.sort_order), asc(onboarding_tasks.created_at));
}

export interface OnboardingProgress {
  done: number;
  total: number;
}
export async function onboardingProgress(employeeId: string): Promise<OnboardingProgress> {
  const tasks = await listTasksForEmployee(employeeId);
  return { done: tasks.filter((t) => t.done).length, total: tasks.length };
}
