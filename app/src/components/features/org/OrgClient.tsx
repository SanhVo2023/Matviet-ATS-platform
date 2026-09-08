"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { EmptyState } from "@/components/primitives/EmptyState";
import { SlideOver } from "@/components/primitives/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
  createPositionAction,
  updatePositionAction,
  deletePositionAction,
} from "@/app/(dashboard)/phong-ban/actions";
import type { DepartmentWithMeta, PositionWithDept } from "@/server/org/repository";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm";

type Option = { id: string; name: string };

interface Props {
  departments: DepartmentWithMeta[];
  positions: PositionWithDept[];
  departmentOptions: Option[];
  heads: Option[];
}

export function OrgClient({ departments, positions, departmentOptions, heads }: Props) {
  const router = useRouter();
  const [deptForm, setDeptForm] = React.useState<{
    open: boolean;
    edit: DepartmentWithMeta | null;
  }>({ open: false, edit: null });
  const [posForm, setPosForm] = React.useState<{ open: boolean; edit: PositionWithDept | null }>({
    open: false,
    edit: null,
  });
  const [confirmKey, setConfirmKey] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onDeleteDept(id: string) {
    setBusy(true);
    const res = await deleteDepartmentAction(id);
    setBusy(false);
    setConfirmKey(null);
    if (res.ok) {
      toast.success(t.success.deleted);
      router.refresh();
    } else toast.error(res.error);
  }

  async function onDeletePos(id: string) {
    setBusy(true);
    const res = await deletePositionAction(id);
    setBusy(false);
    setConfirmKey(null);
    if (res.ok) {
      toast.success(t.success.deleted);
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <>
      <PageHeader icon={Building2} title={t.department.title} subtitle={t.department.subtitle} />

      {/* Departments */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Building2 className="h-4 w-4 text-accent-600" aria-hidden />
            {t.nav.org}
          </h2>
          <Button size="sm" onClick={() => setDeptForm({ open: true, edit: null })}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {t.department.add}
          </Button>
        </div>
        {departments.length === 0 ? (
          <EmptyState icon={Building2} title={t.department.empty} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2.5">{t.department.name}</th>
                    <th className="px-4 py-2.5">{t.department.parent}</th>
                    <th className="px-4 py-2.5">{t.department.head}</th>
                    <th className="px-4 py-2.5 text-right">{t.nav.employees}</th>
                    <th className="px-4 py-2.5 text-right">{t.department.positions}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-900">
                        {d.name}
                        {d.code ? (
                          <span className="ml-2 text-xs text-slate-400">{d.code}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{d.parent_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{d.head_name ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {d.employee_count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {d.position_count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeptForm({ open: true, edit: d })}
                            aria-label={t.action.edit}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          {confirmKey === `dept:${d.id}` ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy}
                              onClick={() => onDeleteDept(d.id)}
                            >
                              {t.action.confirm}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmKey(`dept:${d.id}`)}
                              aria-label={t.action.delete}
                            >
                              <Trash2 className="h-4 w-4 text-error-fg" aria-hidden />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Positions */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Briefcase className="h-4 w-4 text-accent-600" aria-hidden />
            {t.department.positions}
          </h2>
          <Button size="sm" onClick={() => setPosForm({ open: true, edit: null })}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {t.department.addPosition}
          </Button>
        </div>
        {positions.length === 0 ? (
          <EmptyState icon={Briefcase} title={t.department.noPositions} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2.5">{t.department.positionTitle}</th>
                    <th className="px-4 py-2.5">{t.employee.fields.department}</th>
                    <th className="px-4 py-2.5 text-right">{t.nav.employees}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-900">{p.title}</td>
                      <td className="px-4 py-3 text-slate-600">{p.department_name ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {p.employee_count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPosForm({ open: true, edit: p })}
                            aria-label={t.action.edit}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          {confirmKey === `pos:${p.id}` ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy}
                              onClick={() => onDeletePos(p.id)}
                            >
                              {t.action.confirm}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmKey(`pos:${p.id}`)}
                              aria-label={t.action.delete}
                            >
                              <Trash2 className="h-4 w-4 text-error-fg" aria-hidden />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DepartmentSlideOver
        open={deptForm.open}
        edit={deptForm.edit}
        onOpenChange={(open) => setDeptForm((s) => ({ ...s, open }))}
        departmentOptions={departmentOptions}
        heads={heads}
        onDone={() => router.refresh()}
      />
      <PositionSlideOver
        open={posForm.open}
        edit={posForm.edit}
        onOpenChange={(open) => setPosForm((s) => ({ ...s, open }))}
        departmentOptions={departmentOptions}
        onDone={() => router.refresh()}
      />
    </>
  );
}

function DepartmentSlideOver({
  open,
  edit,
  onOpenChange,
  departmentOptions,
  heads,
  onDone,
}: {
  open: boolean;
  edit: DepartmentWithMeta | null;
  onOpenChange: (open: boolean) => void;
  departmentOptions: Option[];
  heads: Option[];
  onDone: () => void;
}) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [headId, setHeadId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(edit?.name ?? "");
      setCode(edit?.code ?? "");
      setParentId(edit?.parent_id ?? "");
      setHeadId(edit?.head_user_id ?? "");
    }
  }, [open, edit]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên phòng ban.");
      return;
    }
    setSaving(true);
    const input = {
      name,
      code: code || null,
      parent_id: parentId || null,
      head_user_id: headId || null,
    };
    const res = edit
      ? await updateDepartmentAction(edit.id, input)
      : await createDepartmentAction(input);
    setSaving(false);
    if (res.ok) {
      toast.success(t.success.saved);
      onOpenChange(false);
      onDone();
    } else toast.error(res.error);
  }

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={edit ? t.department.editTitle : t.department.addTitle}
      width="md"
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <SlideOver.Body className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dept_name">
              {t.department.name}
              <span className="ml-0.5 text-error-fg">*</span>
            </Label>
            <Input id="dept_name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept_code">{t.department.code}</Label>
            <Input id="dept_code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept_parent">{t.department.parent}</Label>
            <select
              id="dept_parent"
              className={SELECT_CLASS}
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">{t.department.noParent}</option>
              {departmentOptions
                .filter((d) => d.id !== edit?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept_head">{t.department.head}</Label>
            <select
              id="dept_head"
              className={SELECT_CLASS}
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
            >
              <option value="">{t.employee.noManager}</option>
              {heads.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
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
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu…" : t.action.save}
          </Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}

function PositionSlideOver({
  open,
  edit,
  onOpenChange,
  departmentOptions,
  onDone,
}: {
  open: boolean;
  edit: PositionWithDept | null;
  onOpenChange: (open: boolean) => void;
  departmentOptions: Option[];
  onDone: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [deptId, setDeptId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(edit?.title ?? "");
      setDeptId(edit?.department_id ?? "");
    }
  }, [open, edit]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên vị trí.");
      return;
    }
    setSaving(true);
    const input = { title, department_id: deptId || null };
    const res = edit
      ? await updatePositionAction(edit.id, input)
      : await createPositionAction(input);
    setSaving(false);
    if (res.ok) {
      toast.success(t.success.saved);
      onOpenChange(false);
      onDone();
    } else toast.error(res.error);
  }

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={edit ? t.department.editPosition : t.department.addPosition}
      width="md"
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <SlideOver.Body className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pos_title">
              {t.department.positionTitle}
              <span className="ml-0.5 text-error-fg">*</span>
            </Label>
            <Input
              id="pos_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos_dept">{t.employee.fields.department}</Label>
            <select
              id="pos_dept"
              className={SELECT_CLASS}
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
            >
              <option value="">{t.employee.unassigned}</option>
              {departmentOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
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
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu…" : t.action.save}
          </Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}
