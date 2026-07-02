/**
 * Auth seam — same exported surface as the Supabase era, now backed by better-auth
 * (ADR 0010). Pages/actions keep calling `requireRole(['admin', 'hr'])` unchanged.
 */
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth-server";
import type { Database } from "@/types/db";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface SessionProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  department_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  email: string | null;
}

/**
 * Profile of the signed-in user, or null. Cached per request (React cache) so
 * layout + page + actions in one render share a single session lookup.
 */
export const getCurrentProfile = cache(async (): Promise<SessionProfile | null> => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as typeof session.user & {
    role?: UserRole;
    phone?: string | null;
    departmentId?: string | null;
    isActive?: boolean;
  };
  return {
    id: u.id,
    full_name: u.name ?? null,
    role: (u.role ?? "hr") as UserRole,
    department_id: u.departmentId ?? null,
    phone: u.phone ?? null,
    avatar_url: u.image ?? null,
    is_active: u.isActive !== false,
    email: u.email ?? null,
  };
});

/** Throws via redirect to /dang-nhap if not authenticated.
 * Returns the profile + email otherwise. */
export async function requireSession(): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/dang-nhap");
  if (!profile.is_active) redirect("/dang-nhap?error=inactive");
  return profile;
}

/** Like `requireSession` but additionally enforces the user's role is in `allowed`.
 * Redirects to / on mismatch (the user lands on their own role's home). */
export async function requireRole(allowed: UserRole[]): Promise<SessionProfile> {
  const profile = await requireSession();
  if (!allowed.includes(profile.role)) redirect("/");
  return profile;
}

/** Convenience predicates mirroring the old SQL helper functions. */
export const isAdmin = (role: UserRole) => role === "admin";
export const isHr = (role: UserRole) => role === "admin" || role === "hr";
export const isManager = (role: UserRole) => role === "hiring_manager";
export const isExec = (role: UserRole) => role === "bod" || role === "tap_doan";
