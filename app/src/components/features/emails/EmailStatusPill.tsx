import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/db";

type EmailStatus = Database["public"]["Enums"]["email_status"];

const STYLES: Record<EmailStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  pending_approval: "bg-amber-100 text-amber-800",
  sent: "bg-emerald-100 text-emerald-800",
  delivered: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  received: "bg-blue-100 text-blue-800",
};

export function EmailStatusPill({ status }: { status: EmailStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {t.emails.statusLabel[status]}
    </span>
  );
}
