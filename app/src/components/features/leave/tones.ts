import type { PillTone } from "@/components/primitives/StatusPill";
import type { Database } from "@/types/db";

/** Leave status → pill tone. Server-safe (no "use client") so cards can share it. */
export const LEAVE_STATUS_TONE: Record<Database["public"]["Enums"]["leave_status"], PillTone> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  cancelled: "neutral",
};
