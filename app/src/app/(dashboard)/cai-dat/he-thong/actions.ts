"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { setSetting, SETTING_KEYS } from "@/server/settings/repository";
import { AI_MODEL_CHOICES } from "@/lib/ai/workers-ai";
import { runScoringJob } from "@/server/scoring/worker";
import { drainQueue } from "@/server/email/sender";
import { runFullDemoSeed } from "@/server/demo/seed-full";
import { unseedDemoData } from "@/server/reports/seed-demo";
import { publicEnv } from "@/types/env";

type Result = { ok: true; message: string } | { ok: false; error: string };

export async function updateAiSettingsAction(input: {
  model: string;
  enabled: boolean;
}): Promise<Result> {
  await requireRole(["admin"]);
  if (!AI_MODEL_CHOICES.some((m) => m.id === input.model)) {
    return { ok: false, error: "Model không nằm trong danh sách cho phép" };
  }
  await setSetting(SETTING_KEYS.aiModel, input.model);
  await setSetting(SETTING_KEYS.aiEnabled, input.enabled ? "true" : "false");
  revalidatePath("/cai-dat/he-thong");
  return {
    ok: true,
    message: `Đã lưu: ${input.model.split("/").pop()} · AI ${input.enabled ? "bật" : "tắt"} (hiệu lực trong ~30 giây)`,
  };
}

/** Manual drain — same work the 5-minute cron does, on demand. */
export async function drainQueuesNowAction(): Promise<Result> {
  await requireRole(["admin"]);
  let scored = 0;
  for (let i = 0; i < 5; i++) {
    const r = await runScoringJob();
    if (r.status === "idle") break;
    scored++;
  }
  const emails = await drainQueue(10);
  revalidatePath("/cai-dat/he-thong");
  return {
    ok: true,
    message: `Đã xử lý: ${scored} lượt chấm điểm, ${emails.drained} email (gửi ${emails.sent ?? 0}, lỗi ${emails.failed ?? 0}).`,
  };
}

/** Sign a user out of every device (better-auth sessions live in D1). */
export async function revokeUserSessionsAction(userId: string): Promise<Result> {
  const me = await requireRole(["admin"]);
  const db = await getDb();
  const gone = await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
    .returning({ id: sessions.id });
  revalidatePath("/cai-dat/he-thong");
  return {
    ok: true,
    message:
      userId === me.id
        ? `Đã thu hồi ${gone.length} phiên (bao gồm phiên hiện tại của bạn — bạn sẽ phải đăng nhập lại).`
        : `Đã thu hồi ${gone.length} phiên đăng nhập.`,
  };
}

export async function seedDemoAction(): Promise<Result> {
  await requireRole(["admin"]);
  const result = await runFullDemoSeed(publicEnv.appUrl);
  revalidatePath("/cai-dat/he-thong");
  if (result.alreadySeeded) return { ok: false, error: "Dữ liệu demo đã tồn tại." };
  return {
    ok: true,
    message: `Đã tạo: ${result.jobs} tin, ${result.richCandidates! + (result.reportCandidates ?? 0)} ứng viên, 4 tài khoản demo (mật khẩu MatViet@2026). Link bài test công khai: ${result.publicTestUrl}`,
  };
}

export async function unseedDemoAction(): Promise<Result> {
  await requireRole(["admin"]);
  const r = await unseedDemoData();
  revalidatePath("/cai-dat/he-thong");
  return { ok: true, message: `Đã xoá ${r.deleted} ứng viên demo (dữ liệu báo cáo).` };
}
