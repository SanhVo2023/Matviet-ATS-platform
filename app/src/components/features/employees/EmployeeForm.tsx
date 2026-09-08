"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlideOver } from "@/components/primitives/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "@/db/schema";
import { createEmployeeAction, updateEmployeeAction } from "@/app/(dashboard)/nhan-vien/actions";
import type { EmployeeFormInput } from "@/server/employees/service";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

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
              <Input
                id="dob"
                type="date"
                value={form.dob ?? ""}
                onChange={(e) => set("dob", e.target.value)}
              />
            </Field>
            <Field label={f.gender} htmlFor="gender">
              <select
                id="gender"
                className={SELECT_CLASS}
                value={form.gender ?? ""}
                onChange={(e) => set("gender", e.target.value || null)}
              >
                <option value="">—</option>
                <option value="male">{t.gender.male}</option>
                <option value="female">{t.gender.female}</option>
                <option value="other">{t.gender.other}</option>
              </select>
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
              <select
                id="department_id"
                className={SELECT_CLASS}
                value={form.department_id ?? ""}
                onChange={(e) => set("department_id", e.target.value || null)}
              >
                <option value="">{t.employee.unassigned}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={f.position} htmlFor="position_id">
              <select
                id="position_id"
                className={SELECT_CLASS}
                value={form.position_id ?? ""}
                onChange={(e) => set("position_id", e.target.value || null)}
              >
                <option value="">{t.employee.unassigned}</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={f.manager} htmlFor="manager_id">
              <select
                id="manager_id"
                className={SELECT_CLASS}
                value={form.manager_id ?? ""}
                onChange={(e) => set("manager_id", e.target.value || null)}
              >
                <option value="">{t.employee.noManager}</option>
                {managerOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={f.employmentType} htmlFor="employment_type">
              <select
                id="employment_type"
                className={SELECT_CLASS}
                value={form.employment_type ?? "full_time"}
                onChange={(e) =>
                  set("employment_type", e.target.value as FormState["employment_type"])
                }
              >
                {EMPLOYMENT_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t.employmentType[v]}
                  </option>
                ))}
              </select>
            </Field>
            {/* Status is set only when creating; afterwards it changes via the
                profile header (two-step confirm) or the offboarding workflow —
                one write path, not three (UX audit P1). */}
            {mode === "create" ? (
              <Field label={f.status} htmlFor="status">
                <select
                  id="status"
                  className={SELECT_CLASS}
                  value={form.status ?? "probation"}
                  onChange={(e) => set("status", e.target.value as FormState["status"])}
                >
                  {EMPLOYEE_STATUSES.filter((v) => v !== "terminated").map((v) => (
                    <option key={v} value={v}>
                      {t.employeeStatus[v]}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label={f.hiredAt} htmlFor="hired_at">
              <Input
                id="hired_at"
                type="date"
                value={form.hired_at ?? ""}
                onChange={(e) => set("hired_at", e.target.value)}
              />
            </Field>
            <Field label={f.startDate} htmlFor="start_date">
              <Input
                id="start_date"
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => set("start_date", e.target.value)}
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
