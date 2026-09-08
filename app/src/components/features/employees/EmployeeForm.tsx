"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlideOver } from "@/components/primitives/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { DateInput } from "@/components/primitives/DateInput";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "@/db/schema";
import { createEmployeeAction, updateEmployeeAction } from "@/app/(dashboard)/nhan-vien/actions";
import type { EmployeeFormInput } from "@/server/employees/service";

export interface EmployeeFormOption {
  id: string;
  label: string;
}

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  employeeId?: string;
  initial?: Partial<EmployeeFormInput>;
  departments: EmployeeFormOption[];
  positions: EmployeeFormOption[];
  managers: EmployeeFormOption[];
}

type FormState = EmployeeFormInput;

const EMPTY: FormState = {
  full_name: "",
  employment_type: "full_time",
  status: "probation",
};

function Field({
  label,
  htmlFor,
  children,
  required,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-error-fg">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 border-b border-slate-100 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h3>
  );
}

export function EmployeeForm({
  open,
  onOpenChange,
  mode,
  employeeId,
  initial,
  departments,
  positions,
  managers,
}: EmployeeFormProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>({ ...EMPTY, ...initial });
  const [saving, setSaving] = React.useState(false);

  // Reset the form each time it opens (initial may change between rows).
  React.useEffect(() => {
    if (open) setForm({ ...EMPTY, ...initial });
  }, [open, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const managerOptions = managers.filter((m) => m.id !== employeeId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Vui lòng nhập họ và tên.");
      return;
    }
    setSaving(true);
    const res =
      mode === "create"
        ? await createEmployeeAction(form)
        : await updateEmployeeAction(employeeId as string, form);
    setSaving(false);
    if (res.ok) {
      toast.success(mode === "create" ? t.employee.converted : t.success.saved);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  const f = t.employee.fields;

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? t.employee.addTitle : t.employee.editTitle}
      width="xl"
    >
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <SlideOver.Body className="space-y-4">
          <SectionTitle>{t.employee.sections.personal}</SectionTitle>
          <Field label={f.fullName} htmlFor="full_name" required>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={f.dob} htmlFor="dob">
              <DateInput id="dob" value={form.dob ?? ""} onChange={(v) => set("dob", v)} />
            </Field>
            <Field label={f.gender} htmlFor="gender">
              <SimpleSelect
                id="gender"
                value={form.gender ?? ""}
                onValueChange={(v) => set("gender", v || null)}
                emptyLabel="—"
                options={[
                  { value: "male", label: t.gender.male },
                  { value: "female", label: t.gender.female },
                  { value: "other", label: t.gender.other },
                ]}
              />
            </Field>
            <Field label={f.phone} htmlFor="phone">
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label={f.email} htmlFor="email">
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label={f.nationalId} htmlFor="national_id">
              <Input
                id="national_id"
                value={form.national_id ?? ""}
                onChange={(e) => set("national_id", e.target.value)}
              />
            </Field>
            <Field label={f.permanentAddress} htmlFor="permanent_address">
              <Input
                id="permanent_address"
                value={form.permanent_address ?? ""}
                onChange={(e) => set("permanent_address", e.target.value)}
              />
            </Field>
          </div>

          <SectionTitle>{t.employee.sections.employment}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={f.code} htmlFor="employee_code">
              <Input
                id="employee_code"
                placeholder="MV0001 — tự tạo nếu để trống"
                value={form.employee_code ?? ""}
                onChange={(e) => set("employee_code", e.target.value)}
              />
            </Field>
            <Field label={f.store} htmlFor="store_location">
              <Input
                id="store_location"
                value={form.store_location ?? ""}
                onChange={(e) => set("store_location", e.target.value)}
              />
            </Field>
            <Field label={f.department} htmlFor="department_id">
              <SimpleSelect
                id="department_id"
                value={form.department_id ?? ""}
                onValueChange={(v) => set("department_id", v || null)}
                emptyLabel={t.employee.unassigned}
                options={departments.map((d) => ({ value: d.id, label: d.label }))}
              />
            </Field>
            <Field label={f.position} htmlFor="position_id">
              <Combobox
                id="position_id"
                value={form.position_id ?? ""}
                onValueChange={(v) => set("position_id", v || null)}
                placeholder={t.employee.unassigned}
                searchPlaceholder={t.action.search}
                clearable
                options={positions.map((p) => ({ value: p.id, label: p.label }))}
              />
            </Field>
            <Field label={f.manager} htmlFor="manager_id">
              <Combobox
                id="manager_id"
                value={form.manager_id ?? ""}
                onValueChange={(v) => set("manager_id", v || null)}
                placeholder={t.employee.noManager}
                searchPlaceholder={t.action.search}
                clearable
                options={managerOptions.map((m) => ({ value: m.id, label: m.label }))}
              />
            </Field>
            <Field label={f.employmentType} htmlFor="employment_type">
              <SimpleSelect
                id="employment_type"
                value={form.employment_type ?? "full_time"}
                onValueChange={(v) => set("employment_type", v as FormState["employment_type"])}
                options={EMPLOYMENT_TYPES.map((v) => ({ value: v, label: t.employmentType[v] }))}
              />
            </Field>
            {/* Status is set only when creating; afterwards it changes via the
                profile header (two-step confirm) or the offboarding workflow —
                one write path, not three (UX audit P1). */}
            {mode === "create" ? (
              <Field label={f.status} htmlFor="status">
                <SimpleSelect
                  id="status"
                  value={form.status ?? "probation"}
                  onValueChange={(v) => set("status", v as FormState["status"])}
                  options={EMPLOYEE_STATUSES.filter((v) => v !== "terminated").map((v) => ({
                    value: v,
                    label: t.employeeStatus[v],
                  }))}
                />
              </Field>
            ) : null}
            <Field label={f.hiredAt} htmlFor="hired_at">
              <DateInput
                id="hired_at"
                value={form.hired_at ?? ""}
                onChange={(v) => set("hired_at", v)}
              />
            </Field>
            <Field label={f.startDate} htmlFor="start_date">
              <DateInput
                id="start_date"
                value={form.start_date ?? ""}
                onChange={(v) => set("start_date", v)}
              />
            </Field>
            <Field label={f.workEmail} htmlFor="work_email">
              <Input
                id="work_email"
                type="email"
                value={form.work_email ?? ""}
                onChange={(e) => set("work_email", e.target.value)}
              />
            </Field>
          </div>

          <SectionTitle>{t.employee.sections.compliance}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={f.bhxhNo} htmlFor="bhxh_no">
              <Input
                id="bhxh_no"
                value={form.bhxh_no ?? ""}
                onChange={(e) => set("bhxh_no", e.target.value)}
              />
            </Field>
            <Field label={f.taxNo} htmlFor="tax_no">
              <Input
                id="tax_no"
                value={form.tax_no ?? ""}
                onChange={(e) => set("tax_no", e.target.value)}
              />
            </Field>
          </div>

          <SectionTitle>{t.employee.sections.bank}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={f.bankAccount} htmlFor="bank_account">
              <Input
                id="bank_account"
                value={form.bank_account ?? ""}
                onChange={(e) => set("bank_account", e.target.value)}
              />
            </Field>
            <Field label={f.bankName} htmlFor="bank_name">
              <Input
                id="bank_name"
                value={form.bank_name ?? ""}
                onChange={(e) => set("bank_name", e.target.value)}
              />
            </Field>
            <Field label={f.emergencyContactName} htmlFor="emergency_contact_name">
              <Input
                id="emergency_contact_name"
                value={form.emergency_contact_name ?? ""}
                onChange={(e) => set("emergency_contact_name", e.target.value)}
              />
            </Field>
            <Field label={f.emergencyContactPhone} htmlFor="emergency_contact_phone">
              <Input
                id="emergency_contact_phone"
                value={form.emergency_contact_phone ?? ""}
                onChange={(e) => set("emergency_contact_phone", e.target.value)}
              />
            </Field>
          </div>

          <Field label={f.notes} htmlFor="notes">
            <Textarea
              id="notes"
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </SlideOver.Body>
        <SlideOver.Footer>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t.action.cancel}
          </Button>
          <Button type="submit" disabled={saving} className={cn(saving && "opacity-70")}>
            {saving ? "Đang lưu…" : t.action.save}
          </Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}
