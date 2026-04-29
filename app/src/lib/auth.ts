/**
 * Helpers around Supabase Auth that wrap `getCurrentProfile()` with role checks.
 * Use from RSC route guards: `await requireRole(['admin', 'hr'])`.
 */
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type SessionProfile = NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>;

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

/** Convenience predicates mirroring the SQL helper functions. */
export const isAdmin = (role: UserRole) => role === "admin";
export const isHr = (role: UserRole) => role === "admin" || role === "hr";
export const isManager = (role: UserRole) => role === "hiring_manager";
export const isExec = (role: UserRole) => role === "bod" || role === "tap_doan";
