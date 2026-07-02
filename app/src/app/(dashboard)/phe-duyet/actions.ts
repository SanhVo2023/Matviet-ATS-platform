"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { decideApproval } from "@/server/approvals/engine";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function decideApprovalAction(
  approvalId: string,
  decision: "approved" | "rejected",
  notes?: string,
): Promise<ActionResult> {
  // Role gate here; the ENGINE enforces role↔step matching + job assignment
  // (Server Actions are directly invocable RPC — UI hiding is not access control).
  const profile = await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);
  if (decision !== "approved" && decision !== "rejected") {
    return { ok: false, error: "Quyết định không hợp lệ" };
  }
  try {
    const r = await decideApproval(
      approvalId,
      decision,
      { id: profile.id, role: profile.role },
      notes,
    );
    revalidatePath("/phe-duyet");
    revalidatePath(`/ung-vien/${r.candidateId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi duyệt" };
  }
}
