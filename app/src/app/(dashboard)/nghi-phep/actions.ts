"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { audit_log } from "@/db/schema";
import {
  createLeaveRequest,
  decideLeave,
  cancelLeave,
  type LeaveRequestInput,
} from "@/server/leave/service";
import { leaveBalanceForEmployee, type LeaveBalance } from "@/server/leave/repository";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function audit(
  actorId: string,
  entityId: string,
  action: string,
  after: Record<string, unknown>,
) {
  const db = await getDb();
  await db
    .insert(audit_log)
    .values({
      entity: "leave_requests",
      entity_id: entityId,
      action,
      actor_user_id: actorId,
      after: after as never,
    })
    .catch(() => {});
}

export async function createLeaveAction(
  input: LeaveRequestInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  try {
    const res = await createLeaveRequest(input, profile.id);
    await audit(profile.id, res.id, "leave_create", {
      employee_id: input.employee_id,
      type: input.type,
    });
    revalidatePath("/nghi-phep");
    revalidatePath(`/nhan-vien/${input.employee_id}`);
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo đơn" };
  }
}

export async function decideLeaveAction(
  id: string,
  decision: "approved" | "rejected",
  note?: string,
): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  try {
    await decideLeave(id, decision, profile.id, note);
    await audit(profile.id, id, `leave_${decision}`, {});
    revalidatePath("/nghi-phep");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

export async function cancelLeaveAction(id: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  try {
    await cancelLeave(id);
    await audit(profile.id, id, "leave_cancel", {});
    revalidatePath("/nghi-phep");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi hủy" };
  }
}

/** Balance preview for the leave form — read-only, so any staff role may ask. */
export async function getLeaveBalanceAction(
  employeeId: string,
): Promise<ActionResult<LeaveBalance>> {
  await requireRole(["admin", "hr", "hiring_manager"]);
  try {
    return { ok: true, data: await leaveBalanceForEmployee(employeeId) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tra cứu" };
  }
}
