/**
 * Server-side Supabase client for RSC + route handlers + server actions.
 * - Reads/writes cookies via Next 15's async `cookies()` helper.
 * - Caller should `await createClient()` because cookies() is async in Next 15.
 * - Cookie writes from RSC will throw silently — that's fine; the middleware
 *   refreshes session cookies on every request before RSC runs.
 */
import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, Tables } from "@/types/db";
import { publicEnv } from "@/types/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

type ProfileRow = Tables<"profiles">;

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — ignore. The middleware will refresh
          // the session on the next navigation.
        }
      },
    },
  });
}

/** Returns the authenticated user or null. Wraps `auth.getUser()` so callers
 * don't need to deconstruct `data.user` repeatedly. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Fetches the profile row for the current user.
 * Returns null if not signed in or profile row missing. */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  const profile = data as ProfileRow | null;
  if (!profile) return null;
  return {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    department_id: profile.department_id,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    is_active: profile.is_active,
    email: user.email ?? null,
  };
}
