"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/primitives/DateInput";
import { SlideOver } from "@/components/primitives/SlideOver";
import { cn } from "@/lib/utils";
import { t, interpolate } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import {
  startOffboardingAction,
  finalizeOffboardingAction,
  addOffboardingTaskAction,
  toggleOffboardingTaskAction,
  removeOffboardingTaskAction,
} from "@/app/(dashboard)/nhan-vien/actions";
import type { OffboardingTaskRow } from "@/server/offboarding/service";
import type { Database } from "@/types/db";

type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

export function OffboardingCard({
  employeeId,
  status,
  lastWorkingDay,
  terminationReason,
  terminatedAt,
  tasks,
}: {
  employeeId: string;
  status: EmployeeStatus;
  lastWorkingDay: string | null;
  terminationReason: string | null;
  terminatedAt: string | null;
  tasks: OffboardingTaskRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [startOpen, setStartOpen] = React.useState(false);
  const [confirmFinalize, setConfirmFinalize] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");

  const started = tasks.length > 0 || !!lastWorkingDay;
  const done = tasks.filter((x) => x.done).length;
  const total = tasks.length;

  async function run(p: Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    setPending(true);
    const res = await p;
    setPending(false);
    if (res.ok) {
      if (okMsg) toast.success(okMsg);
      router.refresh();
    } else if (res.error) toast.error(res.error);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base text-brand-900">
          <LogOut className="h-4 w-4 text-accent-600" aria-hidden />
          {t.offboarding.title}
        </CardTitle>
        {status !== "terminated" && !started ? (
          <Button size="sm" variant="outline" onClick={() => setStartOpen(true)}>
            {t.offboarding.start}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {status === "terminated" ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-slate-700">
              {t.employeeStatus.terminated}
              {terminatedAt ? ` · ${formatDate(terminatedAt)}` : ""}
            </p>
            {terminationReason ? <p className="text-slate-500">{terminationReason}</p> : null}
          </div>
        ) : !started ? (
          <p className="py-2 text-center text-sm text-slate-500">{t.offboarding.notStarted}</p>
        ) : (
          <>
            <div className="mb-3 space-y-0.5 text-sm">
              {lastWorkingDay ? (
                <p>
                  <span className="text-slate-500">{t.offboarding.lastDay}: </span>
                  <span className="font-medium text-brand-900">{formatDate(lastWorkingDay)}</span>
                </p>
              ) : null}
              {terminationReason ? <p className="text-slate-600">{terminationReason}</p> : null}
              {total > 0 ? (
                <p className="text-slate-500">
                  {interpolate(t.offboarding.progress, { done, total })}
                </p>
              ) : null}
            </div>
            <ul className="space-y-1">
              {tasks.map((task) => (
                <li key={task.id} className="group flex items-center gap-2">
                  <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-slate-50">
                    <Checkbox
                      checked={task.done}
                      disabled={pending}
                      onCheckedChange={(c) =>
                        run(toggleOffboardingTaskAction(task.id, employeeId, c === true))
                      }
                    />
                    <span
                      className={cn(
                        "text-sm",
                        task.done ? "text-slate-400 line-through" : "text-brand-900",
                      )}
                    >
                      {task.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => run(removeOffboardingTaskAction(task.id, employeeId))}
                    className="rounded p-1 text-slate-300 opacity-0 transition hover:text-error-fg focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                    aria-label={t.action.delete}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;
                void run(addOffboardingTaskAction(employeeId, newTitle)).then(() =>
                  setNewTitle(""),
                );
              }}
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t.offboarding.taskPlaceholder}
                className="h-9"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={pending || !newTitle.trim()}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </form>
            <div className="mt-4 flex justify-end">
              {confirmFinalize ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    run(finalizeOffboardingAction(employeeId), t.offboarding.finalized)
                  }
                >
                  {t.offboarding.finalizeConfirm}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setConfirmFinalize(true)}>
                  {t.offboarding.finalize}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      <StartOffboardingForm
        open={startOpen}
        onOpenChange={setStartOpen}
        onSubmit={(lastDay, reason) =>
          run(startOffboardingAction(employeeId, { lastDay, reason })).then(() =>
            setStartOpen(false),
          )
        }
      />
    </Card>
  );
}

function StartOffboardingForm({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (lastDay: string | null, reason: string | null) => void;
}) {
  const [lastDay, setLastDay] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setLastDay("");
      setReason("");
    }
  }, [open]);

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title={t.offboarding.startTitle} width="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(lastDay || null, reason || null);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SlideOver.Body className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="off_last">{t.offboarding.lastDay}</Label>
            <DateInput id="off_last" value={lastDay} onChange={setLastDay} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="off_reason">{t.offboarding.reason}</Label>
            <Textarea
              id="off_reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.offboarding.reasonPlaceholder}
            />
          </div>
        </SlideOver.Body>
        <SlideOver.Footer>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.action.cancel}
          </Button>
          <Button type="submit">{t.offboarding.start}</Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}
