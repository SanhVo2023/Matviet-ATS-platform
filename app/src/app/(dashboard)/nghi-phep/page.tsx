import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listLeaveRequests } from "@/server/leave/repository";
import { listEmployeeOptions } from "@/server/employees/repository";
import { LeaveClient } from "@/components/features/leave/LeaveClient";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.leave.title };

export default async function LeavePage() {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  // Managers see + act on their own department; HR/admin see everyone.
  const scope = profile.role === "hiring_manager" ? (profile.department_id ?? null) : null;

  const [leaves, employeeOptions] = await Promise.all([
    listLeaveRequests({ department_id: scope }),
    listEmployeeOptions(scope),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <LeaveClient
        leaves={leaves}
        employeeOptions={employeeOptions.map((e) => ({ id: e.id, name: e.name }))}
      />
    </div>
  );
}
