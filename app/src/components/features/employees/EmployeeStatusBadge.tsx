import { StatusPill, type PillTone } from "@/components/primitives/StatusPill";
import { t } from "@/lib/i18n";
import type { Database } from "@/types/db";

type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

export const EMPLOYEE_STATUS_TONE: Record<EmployeeStatus, PillTone> = {
  probation: "warning",
  active: "success",
  on_leave: "info",
  terminated: "neutral",
};

export function EmployeeStatusBadge({
  status,
  size = "md",
}: {
  status: EmployeeStatus;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <StatusPill tone={EMPLOYEE_STATUS_TONE[status]} size={size}>
      {t.employeeStatus[status]}
    </StatusPill>
  );
}
