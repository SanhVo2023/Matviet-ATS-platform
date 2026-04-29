"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { publicEnv } from "@/types/env";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

const InviteSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  full_name: z.string().min(2, "Họ tên quá ngắn"),
  role: z.enum(["admin", "hr", "hiring_manager", "bod", "tap_doan"]) as z.ZodType<UserRole>,
  department_id: z.string().uuid().nullable().optional(),
});

export type InviteResult = { ok: true; userId: string } | { ok: false; error: string };

/**
 * Admin-only: invite a new user via Supabase magic-link signup.
 * After the user confirms their email and sets a password, the
 * `handle_new_user` trigger creates a `profiles` row with their role.
 *
 * We pass `data: { full_name, role, department_id }` so the trigger picks them up.
 */
export async function inviteUser(formData: FormData): Promise<InviteResult> {
  // Server-side authorization: only admins can invite.
  await requireRole(["admin"]);

  const parsed = InviteSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
    department_id: formData.get("department_id") || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { email, full_name, role, department_id } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${publicEnv.appUrl}/auth/callback?next=/`,
    data: { full_name, role, department_id },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Best-effort: ensure the profile row reflects role + department even if
  // the trigger fired before metadata propagation.
  if (data.user) {
    await admin.from("profiles").upsert({
      id: data.user.id,
      full_name,
      role,
      department_id: department_id || null,
    });
  }

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true, userId: data.user?.id ?? "" };
}
