import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { t, interpolate } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import type { LeaveBalance } from "@/server/leave/repository";
import type { LeaveRequestRow } from "@/server/leave/repository";
import type { Database } from "@/types/db";

const STATUS_CLASS: Record<Database["public"]["Enums"]["leave_status"], string> = {
  pending: "bg-warning-bg text-warning-fg",
  approved: "bg-success-bg text-success-fg",
  rejected: "bg-error-bg text-error-fg",
  cancelled: "bg-slate-100 text-slate-600",
};

export function LeaveCard({
  balance,
  requests,
}: {
  balance: LeaveBalance;
  requests: LeaveRequestRow[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base text-brand-900">
          <CalendarClock className="h-4 w-4 text-accent-600" aria-hidden />
          {t.leave.title}
        </CardTitle>
        <Link href="/nghi-phep" className="text-sm font-medium text-brand-700 hover:underline">
          {t.action.viewAll}
        </Link>
      </CardHeader>
      <CardContent>
        <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">{t.leave.balance}: </span>
          <span className="font-semibold text-brand-900">
            {interpolate(t.leave.balanceValue, {
              remaining: balance.remaining,
              entitlement: balance.entitlement,
            })}
          </span>
        </div>
        {requests.length === 0 ? (
          <p className="py-2 text-center text-sm text-slate-500">{t.leave.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.slice(0, 5).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-slate-700">
                  {t.leaveType[l.type]} · {formatDate(l.start_date)} → {formatDate(l.end_date)} ·{" "}
                  {l.days} ngày
                </span>
                <span
                  className={cn(
                    "inline-flex flex-none items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_CLASS[l.status],
                  )}
                >
                  {t.leaveStatus[l.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
