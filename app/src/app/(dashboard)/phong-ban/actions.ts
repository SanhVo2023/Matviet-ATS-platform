"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { audit_log } from "@/db/schema";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createPosition,
  updatePosition,
  deletePosition,
  type DepartmentInput,
  type PositionInput,
} from "@/server/org/service";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function audit(
  actorId: string,
  entity: "departments" | "positions",
  entityId: string | null,
  action: string,
  after: Record<string, unknown>,
) {
  const db = await getDb();
  await db
    .insert(audit_log)
    .values({ entity, entity_id: entityId, action, actor_user_id: actorId, after: after as never })
    .catch(() => {});
}

export async function createDepartmentAction(
  input: DepartmentInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    const res = await createDepartment(input);
    await audit(profile.id, "departments", res.id, "department_create", { name: input.name });
    revalidatePath("/phong-ban");
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo phòng ban" };
  }
}

export async function updateDepartmentAction(
  id: string,
  input: DepartmentInput,
): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await updateDepartment(id, input);
    await audit(profile.id, "departments", id, "department_update", { name: input.name });
    revalidatePath("/phong-ban");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

export async function deleteDepartmentAction(id: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await deleteDepartment(id);
    await audit(profile.id, "departments", id, "department_delete", {});
    revalidatePath("/phong-ban");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xóa" };
  }
}

export async function createPositionAction(
  input: PositionInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    const res = await createPosition(input);
    await audit(profile.id, "positions", res.id, "position_create", { title: input.title });
    revalidatePath("/phong-ban");
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo vị trí" };
  }
}

export async function updatePositionAction(
  id: string,
  input: PositionInput,
): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await updatePosition(id, input);
    await audit(profile.id, "positions", id, "position_update", { title: input.title });
    revalidatePath("/phong-ban");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

export async function deletePositionAction(id: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await deletePosition(id);
    await audit(profile.id, "positions", id, "position_delete", {});
    revalidatePath("/phong-ban");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xóa" };
  }
}
