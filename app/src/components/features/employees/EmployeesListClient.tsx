"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IdCard, UserPlus, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/primitives/PageHeader";
import { DataTable } from "@/components/primitives/DataTable";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { EmployeeForm, type EmployeeFormOption } from "./EmployeeForm";
import { EmployeeStats } from "./EmployeeStats";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import { EMPLOYEE_STATUSES } from "@/db/schema";
import type { EmployeeListItem, HeadcountStats } from "@/server/employees/repository";

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface Props {
  employees: EmployeeListItem[];
  departments: EmployeeFormOption[];
  positions: EmployeeFormOption[];
  managers: EmployeeFormOption[];
  stats: HeadcountStats;
}

export function EmployeesListClient({ employees, departments, positions, managers, stats }: Props) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (dept !== "all" && e.department_id !== dept) return false;
      if (status !== "all" && e.status !== status) return false;
      if (q) {
        const hay = `${e.full_name} ${e.employee_code ?? ""} ${e.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [employees, search, dept, status]);

  const columns = React.useMemo<ColumnDef<EmployeeListItem, unknown>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: t.employee.fields.fullName,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-brand-900">{row.original.full_name}</div>
            <div className="text-xs text-slate-500">{row.original.employee_code ?? "—"}</div>
          </div>
        ),
      },
      {
        accessorKey: "department_name",
        header: t.employee.fields.department,
        cell: ({ row }) => row.original.department_name ?? "—",
      },
      {
        accessorKey: "position_title",
        header: t.employee.fields.position,
        cell: ({ row }) => row.original.position_title ?? "—",
      },
      {
        accessorKey: "store_location",
        header: t.employee.fields.store,
        cell: ({ row }) => row.original.store_location ?? "—",
      },
      {
        accessorKey: "status",
        header: t.employee.fields.status,
        cell: ({ row }) => <EmployeeStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "start_date",
        header: t.employee.fields.startDate,
        cell: ({ row }) => formatDate(row.original.start_date),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        icon={IdCard}
        title={t.employee.title}
        subtitle={t.employee.subtitle}
        action={
          <Button onClick={() => setFormOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            {t.employee.add}
          </Button>
        }
      />

      <div className="mt-6">
        <EmployeeStats stats={stats} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder={t.employee.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.action.search}
          />
        </div>
        <select
          className={SELECT_CLASS}
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          aria-label={t.employee.fields.department}
        >
          <option value="all">{t.employee.allDepartments}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={t.employee.fields.status}
        >
          <option value="all">{t.employee.allStatuses}</option>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.employeeStatus[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => router.push(`/nhan-vien/${row.id}`)}
          emptyState={
            <EmptyState
              illustration="people"
              title={t.employee.empty}
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                  {t.employee.add}
                </Button>
              }
            />
          }
        />
      </div>

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        departments={departments}
        positions={positions}
        managers={managers}
      />
    </>
  );
}
