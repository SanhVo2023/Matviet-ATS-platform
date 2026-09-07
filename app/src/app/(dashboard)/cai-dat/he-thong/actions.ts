"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, like } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { sessions, users, accounts } from "@/db/schema";
import { getAuth } from "@/lib/auth-server";
import { generateTempPassword } from "@/lib/passwords";
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
  // Env-guarded: absent in production (wrangler.jsonc has no ALLOW_DEMO_SEED),
  // opt-in locally via .dev.vars — demo fixtures must never land in prod data.
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    return {
      ok: false,
      error: "Seed demo bị tắt trên môi trường này (đặt ALLOW_DEMO_SEED=true để bật).",
    };
  }
  const result = await runFullDemoSeed(publicEnv.appUrl);
  revalidatePath("/cai-dat/he-thong");
  if (result.alreadySeeded) return { ok: false, error: "Dữ liệu demo đã tồn tại." };
  const demoPassword = result.users?.[0]?.password ?? "(không rõ)";
  return {
    ok: true,
    message: `Đã tạo: ${result.jobs} tin, ${result.richCandidates! + (result.reportCandidates ?? 0)} ứng viên, 4 tài khoản demo. Mật khẩu dùng chung (hiển thị MỘT lần — ghi lại ngay): ${demoPassword}. Link bài test công khai: ${result.publicTestUrl}`,
  };
}

/**
 * Ban + deactivate + rotate the credential of every `@matviet.test` account
 * and kill their sessions. No hard delete — demo users are referenced by
 * candidates/scoring/audit rows. Run once in production before real use.
 */
export async function lockDemoUsersAction(): Promise<Result> {
  await requireRole(["admin"]);
  const db = await getDb();
  const demoUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, "%@matviet.test"));
  if (demoUsers.length === 0) {
    return { ok: true, message: "Không có tài khoản demo nào để khóa." };
  }
  const ids = demoUsers.map((u) => u.id);
  const auth = await getAuth();
  const authCtx = await auth.$context;
  const rotatedHash = await authCtx.password.hash(generateTempPassword(24));
  await db
    .update(users)
    .set({ banned: true, banReason: "Tài khoản demo đã khóa", isActive: false })
    .where(inArray(users.id, ids));
  await db
    .update(accounts)
    .set({ password: rotatedHash })
    .where(and(inArray(accounts.userId, ids), eq(accounts.providerId, "credential")));
  await db.delete(sessions).where(inArray(sessions.userId, ids));
  revalidatePath("/cai-dat/he-thong");
  revalidatePath("/cai-dat/nguoi-dung");
  return {
    ok: true,
    message: `Đã khóa ${demoUsers.length} tài khoản demo (vô hiệu + đổi mật khẩu ngẫu nhiên + thu hồi phiên).`,
  };
}

export async function unseedDemoAction(): Promise<Result> {
  await requireRole(["admin"]);
  const r = await unseedDemoData();
  revalidatePath("/cai-dat/he-thong");
  return { ok: true, message: `Đã xoá ${r.deleted} ứng viên demo (dữ liệu báo cáo).` };
}
