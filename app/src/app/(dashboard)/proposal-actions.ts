"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import "@/server/ai/runtime";
import { executeProposal, type ExecuteOptions } from "@/server/agent-flows/execute";
import { dismissProposal } from "@/server/agent-flows/repository";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

/** Approve a proposal card on the Hôm nay feed (ADR 0020). */
export async function executeProposalAction(
  id: string,
  options: ExecuteOptions = {},
): Promise<ActionResult<{ message: string }>> {
  const profile = await requireRole(["admin", "hr"]);
  const result = await executeProposal(
    id,
    { id: profile.id, name: profile.full_name ?? "Phòng Nhân sự" },
    options,
  );
  revalidatePath("/");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: { message: result.message } };
}

/** Dismiss a proposal card ("Bỏ qua"). */
export async function dismissProposalAction(id: string): Promise<ActionResult> {
  const profile = await requireRole(["admin", "hr"]);
  const ok = await dismissProposal(id, profile.id);
  revalidatePath("/");
  return ok ? { ok: true } : { ok: false, error: "Đề xuất này đã được xử lý" };
}
