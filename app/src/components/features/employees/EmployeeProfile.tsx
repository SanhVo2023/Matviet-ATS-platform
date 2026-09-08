"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IdCard, Pencil } from "lucide-react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { EmployeeForm, type EmployeeFormOption } from "./EmployeeForm";
import { ContractsCard } from "./ContractsCard";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { OffboardingCard } from "./OffboardingCard";
import { LeaveCard } from "./LeaveCard";
import { setEmployeeStatusAction } from "@/app/(dashboard)/nhan-vien/actions";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import { EMPLOYEE_STATUSES } from "@/db/schema";
import type { EmployeeDetail } from "@/server/employees/repository";
import type { EmployeeFormInput } from "@/server/employees/service";
import type { ContractRow } from "@/server/contracts/repository";
import type { OnboardingTaskRow } from "@/server/onboarding/repository";
import type { LeaveBalance, LeaveRequestRow } from "@/server/leave/repository";
import type { OffboardingTaskRow } from "@/server/offboarding/service";
import type { Database } from "@/types/db";

type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface Props {
  detail: EmployeeDetail;
  departments: EmployeeFormOption[];
  positions: EmployeeFormOption[];
  managers: EmployeeFormOption[];
  contracts: ContractRow[];
  onboardingTasks: OnboardingTaskRow[];
  leaveBalance: LeaveBalance;
  leaveRequests: LeaveRequestRow[];
  offboardingTasks: OffboardingTaskRow[];
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-48 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-brand-900">{value || "—"}</dd>
    </div>
  );
}

export function EmployeeProfile({
  detail,
  departments,
  positions,
  managers,
  contracts,
  onboardingTasks,
  leaveBalance,
  leaveRequests,
  offboardingTasks,
}: Props) {
  const router = useRouter();
  const { employee: e, person: p } = detail;
  const [editOpen, setEditOpen] = React.useState(false);
  const [savingStatus, setSavingStatus] = React.useState(false);
  const f = t.employee.fields;

  const initial: Partial<EmployeeFormInput> = {
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    dob: p.dob,
    gender: p.gender,
    national_id: p.national_id,
    bhxh_no: p.bhxh_no,
    tax_no: p.tax_no,
    permanent_address: p.permanent_address,
    employee_code: e.employee_code,
    department_id: e.department_id,
    position_id: e.position_id,
    manager_id: e.manager_id,
    store_location: e.store_location,
    employment_type: e.employment_type,
    status: e.status,
    hired_at: e.hired_at,
    start_date: e.start_date,
    work_email: e.work_email,
    bank_account: e.bank_account,
    bank_name: e.bank_name,
    emergency_contact_name: e.emergency_contact_name,
    emergency_contact_phone: e.emergency_contact_phone,
    notes: e.notes,
  };

  async function onStatusChange(next: EmployeeStatus) {
    setSavingStatus(true);
    const res = await setEmployeeStatusAction(e.id, next);
    setSavingStatus(false);
    if (res.ok) {
      toast.success(t.success.saved);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      <PageHeader
        icon={IdCard}
        title={p.full_name}
        subtitle={e.employee_code ?? undefined}
        back="/nhan-vien"
        backLabel={t.employee.title}
        action={
          <div className="flex items-center gap-2">
            <select
              className={SELECT_CLASS}
              value={e.status}
              disabled={savingStatus}
              onChange={(ev) => onStatusChange(ev.target.value as EmployeeStatus)}
              aria-label={f.status}
            >
              {EMPLOYEE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.employeeStatus[s]}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              {t.action.edit}
            </Button>
          </div>
        }
      />

      <div className="mt-2">
        <EmployeeStatusBadge status={e.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-900">
              {t.employee.sections.employment}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-slate-100">
              <Row label={f.department} value={detail.department_name} />
              <Row label={f.position} value={detail.position_title} />
              <Row label={f.manager} value={detail.manager_name} />
              <Row label={f.store} value={e.store_location} />
              <Row label={f.employmentType} value={t.employmentType[e.employment_type]} />
              <Row label={f.hiredAt} value={formatDate(e.hired_at)} />
              <Row label={f.startDate} value={formatDate(e.start_date)} />
              <Row label={f.workEmail} value={e.work_email} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-900">
              {t.employee.sections.personal}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-slate-100">
              <Row label={f.phone} value={p.phone} />
              <Row label={f.email} value={p.email} />
              <Row label={f.dob} value={formatDate(p.dob)} />
              <Row
                label={f.gender}
                value={p.gender ? t.gender[p.gender as keyof typeof t.gender] : null}
              />
              <Row label={f.nationalId} value={p.national_id} />
              <Row label={f.permanentAddress} value={p.permanent_address} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-900">
              {t.employee.sections.compliance}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-slate-100">
              <Row label={f.bhxhNo} value={p.bhxh_no} />
              <Row label={f.taxNo} value={p.tax_no} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-900">{t.employee.sections.bank}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-slate-100">
              <Row label={f.bankName} value={e.bank_name} />
              <Row label={f.bankAccount} value={e.bank_account} />
              <Row label={f.emergencyContactName} value={e.emergency_contact_name} />
              <Row label={f.emergencyContactPhone} value={e.emergency_contact_phone} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContractsCard employeeId={e.id} contracts={contracts} />
        <OnboardingChecklist employeeId={e.id} tasks={onboardingTasks} />
        <LeaveCard balance={leaveBalance} requests={leaveRequests} />
        <OffboardingCard
          employeeId={e.id}
          status={e.status}
          lastWorkingDay={e.last_working_day}
          terminationReason={e.termination_reason}
          terminatedAt={e.terminated_at}
          tasks={offboardingTasks}
        />
      </div>

      {e.notes ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base text-brand-900">{f.notes}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{e.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <EmployeeForm
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        employeeId={e.id}
        initial={initial}
        departments={departments}
        positions={positions}
        managers={managers}
      />
    </>
  );
}
