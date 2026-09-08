"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SlideOver } from "@/components/primitives/SlideOver";
import { cn } from "@/lib/utils";
import { t, interpolate } from "@/lib/i18n";
import { formatDate, formatVND } from "@/lib/vi-format";
import { CONTRACT_TYPES } from "@/db/schema";
import {
  createContractAction,
  updateContractAction,
  endContractAction,
  deleteContractAction,
} from "@/app/(dashboard)/nhan-vien/actions";
import type { ContractRow } from "@/server/contracts/repository";
import type { ContractInput } from "@/server/contracts/service";
import type { Database } from "@/types/db";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm";

const STATUS_CLASS: Record<Database["public"]["Enums"]["contract_status"], string> = {
  active: "bg-success-bg text-success-fg",
  expired: "bg-warning-bg text-warning-fg",
  ended: "bg-slate-100 text-slate-600",
};

function daysUntil(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const end = new Date(dateIso).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86_400_000);
}

export function ContractsCard({
  employeeId,
  contracts,
}: {
  employeeId: string;
  contracts: ContractRow[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<{ open: boolean; edit: ContractRow | null }>({
    open: false,
    edit: null,
  });
  const [confirmKey, setConfirmKey] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onEnd(id: string) {
    setBusy(true);
    const res = await endContractAction(id, employeeId);
    setBusy(false);
    setConfirmKey(null);
    if (res.ok) {
      toast.success(t.success.saved);
      router.refresh();
    } else toast.error(res.error);
  }
  async function onDelete(id: string) {
    setBusy(true);
    const res = await deleteContractAction(id, employeeId);
    setBusy(false);
    setConfirmKey(null);
    if (res.ok) {
      toast.success(t.success.deleted);
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base text-brand-900">
          <FileText className="h-4 w-4 text-accent-600" aria-hidden />
          {t.contract.title}
        </CardTitle>
        <Button size="sm" onClick={() => setForm({ open: true, edit: null })}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {t.contract.add}
        </Button>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">{t.contract.none}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {contracts.map((c) => {
              const left = c.status === "active" ? daysUntil(c.end_date) : null;
              return (
                <li key={c.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-brand-900">{t.contractType[c.type]}</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_CLASS[c.status],
                        )}
                      >
                        {t.contractStatus[c.status]}
                      </span>
                      {c.contract_no ? (
                        <span className="text-xs text-slate-400">#{c.contract_no}</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-600">
                      {formatDate(c.start_date)} → {c.end_date ? formatDate(c.end_date) : "—"}
                      {c.base_salary ? ` · ${formatVND(c.base_salary)}` : ""}
                    </div>
                    {left !== null ? (
                      <div
                        className={cn(
                          "mt-0.5 text-xs",
                          left < 0
                            ? "text-error-fg"
                            : left <= 30
                              ? "text-warning-fg"
                              : "text-slate-400",
                        )}
                      >
                        {left < 0
                          ? interpolate(t.contract.expiredAgo, { count: Math.abs(left) })
                          : interpolate(t.contract.expiresIn, { count: left })}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm({ open: true, edit: c })}
                      aria-label={t.action.edit}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    {c.status === "active" ? (
                      confirmKey === `end:${c.id}` ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => onEnd(c.id)}
                        >
                          {t.action.confirm}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmKey(`end:${c.id}`)}
                        >
                          {t.contract.end}
                        </Button>
                      )
                    ) : confirmKey === `del:${c.id}` ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => onDelete(c.id)}
                      >
                        {t.action.confirm}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmKey(`del:${c.id}`)}
                        aria-label={t.action.delete}
                      >
                        <Trash2 className="h-4 w-4 text-error-fg" aria-hidden />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <ContractForm
        open={form.open}
        edit={form.edit}
        employeeId={employeeId}
        onOpenChange={(open) => setForm((s) => ({ ...s, open }))}
        onDone={() => router.refresh()}
      />
    </Card>
  );
}

function ContractForm({
  open,
  edit,
  employeeId,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  edit: ContractRow | null;
  employeeId: string;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [type, setType] = React.useState<ContractInput["type"]>("thu_viec");
  const [contractNo, setContractNo] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [salary, setSalary] = React.useState("");
  const [signedAt, setSignedAt] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setType(edit?.type ?? "thu_viec");
      setContractNo(edit?.contract_no ?? "");
      setStartDate(edit?.start_date ?? "");
      setEndDate(edit?.end_date ?? "");
      setSalary(edit?.base_salary != null ? String(edit.base_salary) : "");
      setSignedAt(edit?.signed_at ?? "");
      setNotes(edit?.notes ?? "");
    }
  }, [open, edit]);

  const noEnd = type === "khong_xac_dinh_thoi_han";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const input: ContractInput = {
      type,
      contract_no: contractNo || null,
      start_date: startDate || null,
      end_date: noEnd ? null : endDate || null,
      base_salary: salary ? Number(salary) : null,
      signed_at: signedAt || null,
      notes: notes || null,
    };
    const res = edit
      ? await updateContractAction(edit.id, employeeId, input)
      : await createContractAction(employeeId, input);
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
      title={edit ? t.contract.editTitle : t.contract.addTitle}
      width="md"
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <SlideOver.Body className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c_type">{t.contract.type}</Label>
            <select
              id="c_type"
              className={SELECT_CLASS}
              value={type}
              onChange={(e) => setType(e.target.value as ContractInput["type"])}
            >
              {CONTRACT_TYPES.map((v) => (
                <option key={v} value={v}>
                  {t.contractType[v]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c_no">{t.contract.contractNo}</Label>
              <Input id="c_no" value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_salary">{t.contract.baseSalary}</Label>
              <Input
                id="c_salary"
                type="number"
                inputMode="numeric"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_start">{t.contract.startDate}</Label>
              <Input
                id="c_start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_end">{t.contract.endDate}</Label>
              <Input
                id="c_end"
                type="date"
                value={endDate}
                disabled={noEnd}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {noEnd ? <p className="text-xs text-slate-400">{t.contract.endDateHint}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_signed">{t.contract.signedAt}</Label>
              <Input
                id="c_signed"
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c_notes">{t.contract.notes}</Label>
            <Textarea
              id="c_notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
