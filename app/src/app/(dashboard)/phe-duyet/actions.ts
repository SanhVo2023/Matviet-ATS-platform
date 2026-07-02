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
  // All four roles can approve their own steps. The engine doesn't enforce
  // role-step matching — that's the inbox's job (only shows steps the user
  // can act on). The Server Action acts as a defence-in-depth role gate.
  const profile = await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);
  if (decision !== "approved" && decision !== "rejected") {
    return { ok: false, error: "Quyết định không hợp lệ" };
  }
  try {
    const r = await decideApproval(approvalId, decision, profile.id, notes);
    revalidatePath("/phe-duyet");
    revalidatePath(`/ung-vien/${r.candidateId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi duyệt" };
  }
}
