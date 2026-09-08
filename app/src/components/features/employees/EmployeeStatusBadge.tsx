import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { Database } from "@/types/db";

type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

const STATUS_CLASS: Record<EmployeeStatus, string> = {
  probation: "bg-warning-bg text-warning-fg",
  active: "bg-success-bg text-success-fg",
  on_leave: "bg-info-bg text-info-fg",
  terminated: "bg-slate-100 text-slate-600",
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_CLASS[status],
      )}
    >
      {t.employeeStatus[status]}
    </span>
  );
}
