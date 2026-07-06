"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth-server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

const CreateSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  full_name: z.string().min(2, "Họ tên quá ngắn"),
  role: z.enum(["admin", "hr", "hiring_manager", "bod", "tap_doan"]) as z.ZodType<UserRole>,
  department_id: z.string().uuid().nullable().optional(),
});

export type InviteResult =
  | { ok: true; userId: string; tempPassword: string }
  | { ok: false; error: string };

/** Random 12-char temp password with mixed classes (shown to the admin exactly once). */
function generateTempPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Admin-only: create a user account with a temporary password (better-auth admin
 * plugin). The admin hands the password over in person / via chat; the user can
 * change it with "Quên mật khẩu" (Graph email reset) any time.
 */
export async function inviteUser(formData: FormData): Promise<InviteResult> {
  await requireRole(["admin"]);

  const parsed = CreateSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
    department_id: formData.get("department_id") || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { email, full_name, role, department_id } = parsed.data;
  const tempPassword = generateTempPassword();

  const auth = await getAuth();
  try {
    const created = await auth.api.createUser({
      headers: await headers(),
      body: {
        email,
        password: tempPassword,
        name: full_name,
        role: role as "admin", // better-auth admin plugin types roles narrowly; ours are app-defined
        data: { departmentId: department_id || null, isActive: true },
      },
    });

    revalidatePath("/cai-dat/nguoi-dung");
    return { ok: true, userId: created.user.id, tempPassword };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không tạo được tài khoản";
    return { ok: false, error: message };
  }
}

export type ToggleResult = { ok: true } | { ok: false; error: string };

/** Admin-only: activate/deactivate an account (soft ban). Deactivation also
 * deletes the user's sessions so open tabs bounce to login immediately. */
export async function setUserActive(userId: string, active: boolean): Promise<ToggleResult> {
  const me = await requireRole(["admin"]);
  if (me.id === userId && !active) {
    return { ok: false, error: "Không thể tự vô hiệu tài khoản của chính mình" };
  }
  const db = await getDb();
  await db.update(users).set({ isActive: active }).where(eq(users.id, userId));
  if (!active) await revokeUserSessions(userId);
  await auditUserAdmin(me.id, userId, active ? "admin_activate_user" : "admin_deactivate_user", {
    active,
  });
  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// G-polish (ADR 0015): common per-user admin actions + password flows
// ---------------------------------------------------------------------------

import { sessions, audit_log } from "@/db/schema";
import { requireSession } from "@/lib/auth";

const UpdateUserSchema = z.object({
  user_id: z.string().min(1),
  full_name: z.string().trim().min(2, "Họ tên quá ngắn").max(120),
  role: z.enum(["admin", "hr", "hiring_manager", "bod", "tap_doan"]) as z.ZodType<UserRole>,
  department_id: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

async function auditUserAdmin(
  actorId: string,
  targetUserId: string,
  action: string,
  after: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  await db
    .insert(audit_log)
    .values({
      entity: "users",
      entity_id: targetUserId,
      action,
      actor_user_id: actorId,
      after: after as never,
    })
    .catch(() => {});
}

/** Admin-only: edit name / role / department / phone. */
export async function updateUserAction(input: unknown): Promise<ToggleResult> {
  const me = await requireRole(["admin"]);
  const parsed = UpdateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const { user_id, full_name, role, department_id, phone } = parsed.data;
  if (me.id === user_id && role !== "admin") {
    return { ok: false, error: "Không thể tự hạ quyền tài khoản admin của chính mình" };
  }
  const db = await getDb();
  await db
    .update(users)
    .set({
      name: full_name,
      role,
      departmentId: department_id || null,
      phone: phone?.trim() || null,
    })
    .where(eq(users.id, user_id));
  await auditUserAdmin(me.id, user_id, "admin_update_user", { full_name, role, department_id });
  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

/**
 * Admin-only: email the user a password-reset link (same flow as "Quên mật
 * khẩu" — branded email, 1h token). Nothing sensitive passes through chat/UI.
 */
export async function sendResetEmailAction(userId: string): Promise<ToggleResult> {
  const me = await requireRole(["admin"]);
  const db = await getDb();
  const target = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  if (!target) return { ok: false, error: "Không tìm thấy người dùng" };
  try {
    const auth = await getAuth();
    await auth.api.requestPasswordReset({
      body: { email: target.email, redirectTo: "/dat-lai-mat-khau/moi" },
    });
    await auditUserAdmin(me.id, userId, "admin_send_reset", { email: target.email });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không gửi được email" };
  }
}

/** Any signed-in user: send MYSELF a password-change link (TopBar menu). */
export async function requestMyPasswordResetAction(): Promise<ToggleResult> {
  const me = await requireSession();
  if (!me.email) return { ok: false, error: "Tài khoản chưa có email" };
  try {
    const auth = await getAuth();
    await auth.api.requestPasswordReset({
      body: { email: me.email, redirectTo: "/dat-lai-mat-khau/moi" },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không gửi được email" };
  }
}

/** Instant sign-out everywhere: used when deactivating an account. */
export async function revokeUserSessions(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
