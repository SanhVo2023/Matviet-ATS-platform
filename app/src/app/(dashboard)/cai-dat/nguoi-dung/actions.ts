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

/** Admin-only: activate/deactivate an account (soft ban). */
export async function setUserActive(userId: string, active: boolean): Promise<ToggleResult> {
  const me = await requireRole(["admin"]);
  if (me.id === userId && !active) {
    return { ok: false, error: "Không thể tự vô hiệu tài khoản của chính mình" };
  }
  const db = await getDb();
  await db.update(users).set({ isActive: active }).where(eq(users.id, userId));
  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}
