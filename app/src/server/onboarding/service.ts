import "server-only";
import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { onboarding_tasks } from "@/db/schema";

/** Default onboarding checklist for a Mắt Việt hire (Vietnamese optical retail). */
export const ONBOARDING_TEMPLATE: { title: string; category: string }[] = [
  { title: "Ký hợp đồng thử việc", category: "paperwork" },
  { title: "Nộp hồ sơ nhân sự (CCCD, bằng cấp, ảnh)", category: "paperwork" },
  { title: "Đăng ký thông tin BHXH / thuế TNCN", category: "paperwork" },
  { title: "Cung cấp số tài khoản ngân hàng nhận lương", category: "paperwork" },
  { title: "Cấp tài khoản chấm công", category: "setup" },
  { title: "Cấp đồng phục & thẻ nhân viên", category: "setup" },
  { title: "Giới thiệu cửa hàng & đồng nghiệp", category: "intro" },
  { title: "Phân công người kèm (buddy)", category: "intro" },
  { title: "Đào tạo quy trình bán hàng & sản phẩm", category: "training" },
  { title: "Đào tạo đo mắt / tư vấn tròng kính cơ bản", category: "training" },
];

/**
 * Seed the onboarding checklist from the template (idempotent — no-op if the
 * employee already has tasks). `db` passed in so it can run inside the
 * onboarding-packet proposal execution.
 */
export async function seedOnboardingTasks(db: Db, employeeId: string): Promise<number> {
  const existing = await db
    .select({ id: onboarding_tasks.id })
    .from(onboarding_tasks)
    .where(eq(onboarding_tasks.employee_id, employeeId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (existing) return 0;

  await db.insert(onboarding_tasks).values(
    ONBOARDING_TEMPLATE.map((task, i) => ({
      employee_id: employeeId,
      title: task.title,
      category: task.category,
      sort_order: i,
    })),
  );
  return ONBOARDING_TEMPLATE.length;
}

export async function addOnboardingTask(employeeId: string, title: string): Promise<void> {
  const t = title.trim();
  if (!t) throw new Error("Nội dung việc không được để trống.");
  const db = await getDb();
  await db.insert(onboarding_tasks).values({ employee_id: employeeId, title: t, sort_order: 999 });
}

export async function toggleOnboardingTask(
  id: string,
  done: boolean,
  actorId: string | null,
): Promise<void> {
  const db = await getDb();
  await db
    .update(onboarding_tasks)
    .set({
      done,
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? actorId : null,
    })
    .where(eq(onboarding_tasks.id, id));
}

export async function removeOnboardingTask(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(onboarding_tasks).where(eq(onboarding_tasks.id, id));
}
