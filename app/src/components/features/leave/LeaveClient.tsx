"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Plus, Check, X } from "lucide-react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { EmptyState } from "@/components/primitives/EmptyState";
import { SlideOver } from "@/components/primitives/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import { LEAVE_TYPES } from "@/db/schema";
import { inclusiveDays } from "@/server/leave/util";
import {
  createLeaveAction,
  decideLeaveAction,
  cancelLeaveAction,
  getLeaveBalanceAction,
} from "@/app/(dashboard)/nghi-phep/actions";
import type { LeaveListItem, LeaveBalance } from "@/server/leave/repository";
import type { LeaveRequestInput } from "@/server/leave/service";
import type { Database } from "@/types/db";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm";

const STATUS_CLASS: Record<Database["public"]["Enums"]["leave_status"], string> = {
  pending: "bg-warning-bg text-warning-fg",
  approved: "bg-success-bg text-success-fg",
  rejected: "bg-error-bg text-error-fg",
  cancelled: "bg-slate-100 text-slate-600",
};

type Option = { id: string; name: string };

export function LeaveClient({
  leaves,
  employeeOptions,
}: {
  leaves: LeaveListItem[];
  employeeOptions: Option[];
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<LeaveListItem | null>(null);

  const filtered = React.useMemo(
    () => (status === "all" ? leaves : leaves.filter((l) => l.status === status)),
    [leaves, status],
  );

  async function decide(id: string, decision: "approved" | "rejected", note?: string) {
    setBusy(id);
    const res = await decideLeaveAction(id, decision, note);
    setBusy(null);
    if (res.ok) {
      toast.success(decision === "approved" ? t.success.approved : t.success.rejected);
      router.refresh();
    } else toast.error(res.error);
  }
  async function cancel(id: string) {
    setBusy(id);
    const res = await cancelLeaveAction(id);
    setBusy(null);
    if (res.ok) {
      toast.success(t.success.saved);
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <>
      <PageHeader
        icon={CalendarClock}
        title={t.leave.title}
        subtitle={t.leave.subtitle}
        action={
          employeeOptions.length > 0 ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t.leave.add}
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 flex items-center gap-3">
        <select
          className={cn(SELECT_CLASS, "w-auto")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={t.leave.status}
        >
          <option value="all">{t.leave.allStatuses}</option>
          {(["pending", "approved", "rejected", "cancelled"] as const).map((s) => (
            <option key={s} value={s}>
              {t.leaveStatus[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState illustration="calendar" title={t.leave.empty} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2.5">{t.leave.employee}</th>
                    <th className="px-4 py-2.5">{t.leave.type}</th>
                    <th className="px-4 py-2.5">
                      {t.leave.from} → {t.leave.to}
                    </th>
                    <th className="px-4 py-2.5 text-right">{t.leave.days}</th>
                    <th className="px-4 py-2.5">{t.leave.status}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-brand-900">{l.employee_name}</div>
                        <div className="text-xs text-slate-400">{l.department_name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.leaveType[l.type]}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(l.start_date)} → {formatDate(l.end_date)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{l.days}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            STATUS_CLASS[l.status],
                          )}
                        >
                          {t.leaveStatus[l.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {l.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={busy === l.id}
                                onClick={() => decide(l.id, "approved")}
                              >
                                <Check className="mr-1 h-4 w-4" aria-hidden />
                                {t.leave.approve}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy === l.id}
                                onClick={() => setRejecting(l)}
                              >
                                <X className="mr-1 h-4 w-4" aria-hidden />
                                {t.leave.reject}
                              </Button>
                            </>
                          ) : l.status === "approved" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy === l.id}
                              onClick={() => cancel(l.id)}
                            >
                              {t.leave.cancel}
                            </Button>
                          ) : null}
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

      <LeaveForm
        open={formOpen}
        onOpenChange={setFormOpen}
        employeeOptions={employeeOptions}
        onDone={() => router.refresh()}
      />
      <RejectLeaveDialog
        leave={rejecting}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
        onConfirm={async (note) => {
          const target = rejecting;
          setRejecting(null);
          if (target) await decide(target.id, "rejected", note);
        }}
      />
    </>
  );
}

function LeaveForm({
  open,
  onOpenChange,
  employeeOptions,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeOptions: Option[];
  onDone: () => void;
}) {
  const [employeeId, setEmployeeId] = React.useState("");
  const [type, setType] = React.useState<LeaveRequestInput["type"]>("annual");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [balance, setBalance] = React.useState<LeaveBalance | null>(null);

  React.useEffect(() => {
    if (!employeeId) {
      setBalance(null);
      return;
    }
    let alive = true;
    getLeaveBalanceAction(employeeId).then((res) => {
      if (alive && res.ok && res.data) setBalance(res.data);
    });
    return () => {
      alive = false;
    };
  }, [employeeId]);

  React.useEffect(() => {
    if (open) {
      setEmployeeId("");
      setType("annual");
      setStart("");
      setEnd("");
      setReason("");
    }
  }, [open]);

  const days = start && end ? inclusiveDays(start, end) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) {
      toast.error(t.leave.pickEmployee);
      return;
    }
    setSaving(true);
    const res = await createLeaveAction({
      employee_id: employeeId,
      type,
      start_date: start,
      end_date: end,
      days,
      reason: reason || null,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(t.success.saved);
      onOpenChange(false);
      onDone();
    } else toast.error(res.error);
  }

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title={t.leave.addTitle} width="md">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <SlideOver.Body className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lv_emp">
              {t.leave.employee}
              <span className="ml-0.5 text-error-fg">*</span>
            </Label>
            <select
              id="lv_emp"
              className={SELECT_CLASS}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            >
              <option value="">{t.leave.pickEmployee}</option>
              {employeeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            {balance ? (
              <p
                className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600"
                aria-live="polite"
              >
                {t.leave.balanceLine}:{" "}
                <span className="font-semibold text-brand-900">{balance.remaining}</span>/
                {balance.entitlement} {t.leave.dayUnit} · {t.leave.balanceUsed} {balance.used}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lv_type">{t.leave.type}</Label>
            <select
              id="lv_type"
              className={SELECT_CLASS}
              value={type}
              onChange={(e) => setType(e.target.value as LeaveRequestInput["type"])}
            >
              {LEAVE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {t.leaveType[v]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lv_start">{t.leave.from}</Label>
              <Input
                id="lv_start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv_end">{t.leave.to}</Label>
              <Input
                id="lv_end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>
          {days > 0 ? (
            <p className="text-sm text-slate-500">
              {t.leave.days}: <span className="font-medium text-brand-900">{days}</span>
              {type === "annual" && balance && days > balance.remaining ? (
                <span className="mt-1 block text-warning-fg">{t.leave.balanceOver}</span>
              ) : null}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="lv_reason">{t.leave.reason}</Label>
            <Textarea
              id="lv_reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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

/**
 * Reject with a note — a leave rejection lands on a person, so the reason is
 * written down (optional, but always asked for). Two taps, never one.
 */
function RejectLeaveDialog({
  leave,
  onOpenChange,
  onConfirm,
}: {
  leave: LeaveListItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => Promise<void>;
}) {
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const open = leave !== null;

  React.useEffect(() => {
    if (open) setNote("");
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onConfirm(note.trim());
    setSaving(false);
  }

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title={t.leave.rejectTitle} width="md">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <SlideOver.Body className="space-y-4">
          {leave ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <div className="font-medium text-brand-900">{leave.employee_name}</div>
              <div className="text-slate-600">
                {t.leaveType[leave.type]} · {formatDate(leave.start_date)} →{" "}
                {formatDate(leave.end_date)} · {leave.days} {t.leave.dayUnit}
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="lv_reject_note">{t.leave.decisionNote}</Label>
            <Textarea
              id="lv_reject_note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-slate-500">{t.leave.rejectHint}</p>
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
          <Button type="submit" variant="destructive" disabled={saving}>
            <X className="mr-1 h-4 w-4" aria-hidden />
            {saving ? "Đang lưu…" : t.leave.reject}
          </Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}
