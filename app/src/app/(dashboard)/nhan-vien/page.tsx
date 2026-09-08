import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import {
  listEmployees,
  listManagerOptions,
  employeeHeadcountStats,
} from "@/server/employees/repository";
import { listDepartmentOptions, listPositionOptions } from "@/server/org/repository";
import { EmployeesListClient } from "@/components/features/employees/EmployeesListClient";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.employee.title };

export default async function EmployeesPage() {
  await requireRole(["admin", "hr"]);

  const [employees, departments, positions, managers, stats] = await Promise.all([
    listEmployees(),
    listDepartmentOptions(),
    listPositionOptions(),
    listManagerOptions(),
    employeeHeadcountStats(),
  ]);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <EmployeesListClient
        employees={employees}
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        positions={positions.map((p) => ({ id: p.id, label: p.title }))}
        managers={managers.map((m) => ({ id: m.id, label: m.name }))}
        stats={stats}
      />
    </div>
  );
}
