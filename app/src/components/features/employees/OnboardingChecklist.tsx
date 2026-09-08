"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { t, interpolate } from "@/lib/i18n";
import {
  seedOnboardingAction,
  addOnboardingTaskAction,
  toggleOnboardingTaskAction,
  removeOnboardingTaskAction,
} from "@/app/(dashboard)/nhan-vien/actions";
import type { OnboardingTaskRow } from "@/server/onboarding/repository";

export function OnboardingChecklist({
  employeeId,
  tasks,
}: {
  employeeId: string;
  tasks: OnboardingTaskRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  async function run(p: Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    const res = await p;
    setPending(false);
    if (res.ok) router.refresh();
    else if (res.error) toast.error(res.error);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base text-brand-900">
          <ListChecks className="h-4 w-4 text-accent-600" aria-hidden />
          {t.onboarding.title}
        </CardTitle>
        {total > 0 ? (
          <span className="text-sm text-slate-500">
            {interpolate(t.onboarding.progress, { done, total })}
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-slate-500">{t.onboarding.empty}</p>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(seedOnboardingAction(employeeId))}
            >
              {t.onboarding.seed}
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-success-fg transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ul className="space-y-1">
              {tasks.map((task) => (
                <li key={task.id} className="group flex items-center gap-2">
                  <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-slate-50">
                    <Checkbox
                      checked={task.done}
                      disabled={pending}
                      onCheckedChange={(c) =>
                        run(toggleOnboardingTaskAction(task.id, employeeId, c === true))
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
                    onClick={() => run(removeOnboardingTaskAction(task.id, employeeId))}
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
                void run(addOnboardingTaskAction(employeeId, newTitle)).then(() => setNewTitle(""));
              }}
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t.onboarding.taskPlaceholder}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
