"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { audit_log } from "@/db/schema";
import {
  createEmployeeManual,
  updateEmployee,
  setEmployeeStatus,
  ensureEmployeeForCandidate,
  type EmployeeFormInput,
} from "@/server/employees/service";
import {
  createContract,
  updateContract,
  endContract,
  deleteContract,
  type ContractInput,
} from "@/server/contracts/service";
import {
  seedOnboardingTasks,
  addOnboardingTask,
  toggleOnboardingTask,
  removeOnboardingTask,
} from "@/server/onboarding/service";
import type { Database } from "@/types/db";

type EmployeeStatus = Database["public"]["Enums"]["employee_status"];
export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function audit(
  actorId: string,
  entityId: string | null,
  action: string,
  after: Record<string, unknown>,
) {
  const db = await getDb();
  await db
    .insert(audit_log)
    .values({
      entity: "employees",
      entity_id: entityId,
      action,
      actor_user_id: actorId,
      after: after as never,
    })
    .catch(() => {});
}

export async function createEmployeeAction(
  input: EmployeeFormInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    const res = await createEmployeeManual(input);
    await audit(profile.id, res.id, "employee_create", { full_name: input.full_name });
    revalidatePath("/nhan-vien");
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo nhân viên" };
  }
}

export async function updateEmployeeAction(
  id: string,
  input: EmployeeFormInput,
): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await updateEmployee(id, input);
    await audit(profile.id, id, "employee_update", { full_name: input.full_name });
    revalidatePath("/nhan-vien");
    revalidatePath(`/nhan-vien/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

export async function setEmployeeStatusAction(
  id: string,
  status: EmployeeStatus,
): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await setEmployeeStatus(id, status);
    await audit(profile.id, id, "employee_status", { status });
    revalidatePath("/nhan-vien");
    revalidatePath(`/nhan-vien/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật trạng thái" };
  }
}

/** Manual candidate → employee conversion (auto path runs on hire; this backfills). */
export async function convertCandidateAction(
  candidateId: string,
): Promise<ActionResult<{ id: string; created: boolean }>> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    const res = await ensureEmployeeForCandidate(candidateId);
    await audit(profile.id, res.id, "employee_from_candidate", { candidate_id: candidateId });
    revalidatePath("/nhan-vien");
    revalidatePath(`/ung-vien/${candidateId}`);
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi chuyển đổi" };
  }
}

// ----- Contracts (H1) -----

export async function createContractAction(
  employeeId: string,
  input: ContractInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    const res = await createContract(employeeId, input, profile.id);
    await audit(profile.id, employeeId, "contract_create", { type: input.type });
    revalidatePath(`/nhan-vien/${employeeId}`);
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo hợp đồng" };
  }
}

export async function updateContractAction(
  id: string,
  employeeId: string,
  input: ContractInput,
): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await updateContract(id, input);
    await audit(profile.id, employeeId, "contract_update", { contract_id: id });
    revalidatePath(`/nhan-vien/${employeeId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật hợp đồng" };
  }
}

export async function endContractAction(id: string, employeeId: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await endContract(id);
    await audit(profile.id, employeeId, "contract_end", { contract_id: id });
    revalidatePath(`/nhan-vien/${employeeId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

export async function deleteContractAction(id: string, employeeId: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await deleteContract(id);
    await audit(profile.id, employeeId, "contract_delete", { contract_id: id });
    revalidatePath(`/nhan-vien/${employeeId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xóa" };
  }
}

// ----- Onboarding (H1) -----

export async function seedOnboardingAction(employeeId: string): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  try {
    const db = await getDb();
    await seedOnboardingTasks(db, employeeId);
    revalidatePath(`/nhan-vien/${employeeId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi tạo danh sách" };
  }
}

export async function addOnboardingTaskAction(
  employeeId: string,
  title: string,
): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  try {
    await addOnboardingTask(employeeId, title);
    revalidatePath(`/nhan-vien/${employeeId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi thêm việc" };
  }
}

export async function toggleOnboardingTaskAction(
  id: string,
  employeeId: string,
  done: boolean,
): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  try {
    await toggleOnboardingTask(id, done, profile.id);
    revalidatePath(`/nhan-vien/${employeeId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật" };
  }
}

export async function removeOnboardingTaskAction(
  id: string,
  employeeId: string,
): Promise<ActionResult> {
  await requireRole(["admin", "hr"]);
  try {
    await removeOnboardingTask(id);
    revalidatePath(`/nhan-vien/${employeeId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xóa" };
  }
}
