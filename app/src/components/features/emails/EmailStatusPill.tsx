import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import type { Database } from "@/types/db";

type EmailStatus = Database["public"]["Enums"]["email_status"];

/** Email status → Badge tone (design-language §4.5). */
const TONES: Record<
  EmailStatus,
  "neutral" | "brand" | "accent" | "success" | "warning" | "danger"
> = {
  queued: "neutral",
  pending_approval: "warning",
  sent: "success",
  delivered: "success",
  failed: "danger",
  received: "brand",
};

export function EmailStatusPill({ status }: { status: EmailStatus }) {
  return <Badge tone={TONES[status]}>{t.emails.statusLabel[status]}</Badge>;
}
