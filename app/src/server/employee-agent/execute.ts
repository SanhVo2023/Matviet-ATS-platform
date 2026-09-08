import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contracts, employees } from "@/db/schema";
import { seedOnboardingTasks } from "@/server/onboarding/service";
import { seedProbationContract, createContract } from "@/server/contracts/service";
import { setEmployeeStatus } from "@/server/employees/service";
import { getContract } from "@/server/contracts/repository";
import type { ExecuteActor, ExecuteResult } from "@/server/agent-flows/execute";
import type { ProposalRow } from "@/server/agent-flows/repository";

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Execute an employee-lifecycle proposal (HRM H1) — same services a manual action uses. */
export async function executeEmployeeProposal(
  p: ProposalRow,
  actor: ExecuteActor,
): Promise<ExecuteResult> {
  if (!p.employee_id) return { ok: false, error: "Thiếu nhân viên" };
  const employeeId = p.employee_id;
  const payload = (p.payload ?? {}) as { contract_id?: string };

  switch (p.kind) {
    case "onboarding_packet": {
      const db = await getDb();
      const emp = await db
        .select({ start_date: employees.start_date })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1)
        .then((r) => r[0] ?? null);
      const taskCount = await seedOnboardingTasks(db, employeeId);
      await seedProbationContract(db, employeeId, {
        startDate: emp?.start_date ?? null,
        createdBy: actor.id,
      });
      return {
        ok: true,
        executedRef: { employee_id: employeeId },
        message: taskCount
          ? "Đã tạo danh sách hội nhập + hợp đồng thử việc"
          : "Đã tạo hợp đồng thử việc (danh sách hội nhập đã có)",
      };
    }

    case "probation_review": {
      const db = await getDb();
      await setEmployeeStatus(employeeId, "active");
      if (payload.contract_id) {
        await db
          .update(contracts)
          .set({ status: "ended" })
          .where(eq(contracts.id, payload.contract_id));
      }
      return {
        ok: true,
        executedRef: { employee_id: employeeId },
        message: "Đã xác nhận đạt thử việc — nhân viên chuyển sang chính thức",
      };
    }

    case "contract_renewal": {
      if (!payload.contract_id) return { ok: false, error: "Thiếu hợp đồng" };
      const old = await getContract(payload.contract_id);
      if (!old) return { ok: false, error: "Không tìm thấy hợp đồng cũ" };

      const start = old.end_date ? new Date(old.end_date) : new Date();
      start.setDate(start.getDate() + 1);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);

      const { id: newId } = await createContract(
        employeeId,
        {
          type: "xac_dinh_thoi_han",
          start_date: isoDate(start),
          end_date: isoDate(end),
          base_salary: old.base_salary ?? null,
          status: "active",
        },
        actor.id,
      );
      const db = await getDb();
      await db
        .update(contracts)
        .set({ status: "expired" })
        .where(eq(contracts.id, payload.contract_id));
      return {
        ok: true,
        executedRef: { contract_id: newId },
        message:
          "Đã tạo hợp đồng gia hạn (xác định thời hạn 12 tháng) — kiểm tra điều khoản trước khi ký",
      };
    }

    default:
      return { ok: false, error: `Loại đề xuất chưa hỗ trợ: ${p.kind}` };
  }
}
