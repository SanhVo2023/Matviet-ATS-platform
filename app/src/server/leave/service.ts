import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { leave_requests, employees, people } from "@/db/schema";
import { inclusiveDays } from "./util";
import { leaveBalanceForEmployee, teamCoverageOverlap } from "./repository";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import type { Database } from "@/types/db";

type LeaveType = Database["public"]["Enums"]["leave_type"];

export interface LeaveRequestInput {
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  days?: number;
  reason?: string | null;
}

export async function createLeaveRequest(
  input: LeaveRequestInput,
  createdBy: string | null,
): Promise<{ id: string }> {
  if (!input.start_date || !input.end_date) throw new Error("Vui lòng chọn ngày nghỉ.");
  if (Date.parse(input.end_date) < Date.parse(input.start_date)) {
    throw new Error("Ngày kết thúc phải sau ngày bắt đầu.");
  }
  const days =
    input.days && input.days > 0 ? input.days : inclusiveDays(input.start_date, input.end_date);
  if (days <= 0) throw new Error("Số ngày nghỉ không hợp lệ.");

  const db = await getDb();
  const inserted = await db
    .insert(leave_requests)
    .values({
      employee_id: input.employee_id,
      type: input.type,
      start_date: input.start_date,
      end_date: input.end_date,
      days,
      reason: input.reason?.trim() || null,
      status: "pending",
      created_by: createdBy,
    })
    .returning({ id: leave_requests.id });
  const id = inserted[0]?.id;
  if (!id) throw new Error("Không tạo được đơn nghỉ phép.");

  // Propose the decision on the "Hôm nay" feed (best-effort).
  try {
    const emp = await db
      .select({ name: people.full_name })
      .from(employees)
      .innerJoin(people, eq(employees.person_id, people.id))
      .where(eq(employees.id, input.employee_id))
      .limit(1)
      .then((r) => r[0] ?? null);
    const [balance, coverage] = await Promise.all([
      leaveBalanceForEmployee(input.employee_id),
      teamCoverageOverlap(input.employee_id, input.start_date, input.end_date),
    ]);
    const name = emp?.name ?? "Nhân viên";
    const typeLabel = t.leaveType[input.type];
    const balanceLine =
      input.type === "annual"
        ? `Số dư phép năm còn ${balance.remaining}/${balance.entitlement} ngày. `
        : "";
    const coverageLine =
      coverage > 0
        ? `Cùng thời gian có ${coverage} người khác trong phòng đang nghỉ.`
        : "Không có ai khác trong phòng nghỉ cùng thời gian.";
    const { proposeLeaveDecision } = await import("@/server/employee-agent/generators");
    await proposeLeaveDecision({
      employeeId: input.employee_id,
      employeeName: name,
      requestId: id,
      summary: `Duyệt nghỉ phép: ${name} — ${days} ngày ${typeLabel}`,
      reasoning: `Từ ${formatDate(input.start_date)} đến ${formatDate(input.end_date)}. ${balanceLine}${coverageLine}`,
    });
  } catch {
    // recoverable — the request still appears on /nghi-phep for manual decision
  }

  return { id };
}

/** Approve or reject a leave request; supersede its open feed card either way. */
export async function decideLeave(
  id: string,
  decision: "approved" | "rejected",
  actorId: string,
  note?: string | null,
): Promise<void> {
  const db = await getDb();
  await db
    .update(leave_requests)
    .set({
      status: decision,
      decided_by: actorId,
      decided_at: new Date().toISOString(),
      decision_note: note?.trim() || null,
    })
    .where(eq(leave_requests.id, id));
  try {
    const { supersedeProposalByDedupeKey } = await import("@/server/agent-flows/repository");
    await supersedeProposalByDedupeKey(`lv:${id}`);
  } catch {
    // feed card will drop on next reconcile/refresh
  }
}

export async function cancelLeave(id: string): Promise<void> {
  const db = await getDb();
  await db.update(leave_requests).set({ status: "cancelled" }).where(eq(leave_requests.id, id));
  try {
    const { supersedeProposalByDedupeKey } = await import("@/server/agent-flows/repository");
    await supersedeProposalByDedupeKey(`lv:${id}`);
  } catch {
    // best-effort
  }
}
