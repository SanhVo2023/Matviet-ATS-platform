/**
 * Service-role Supabase client. SERVER ONLY.
 * Bypasses RLS — use only for trusted server-side ops:
 *   - Inviting users (auth.admin.inviteUserByEmail)
 *   - Background scoring pipeline writes
 *   - Cron jobs that must touch all rows
 *
 * Never accept user-controllable input as a query filter without explicit
 * authorization checks first.
 */
import "server-only";
import { createClient as createAdminBaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { publicEnv, serverEnv } from "@/types/env";

let cached: ReturnType<typeof createAdminBaseClient<Database>> | null = null;

export function createAdminClient() {
  if (cached) return cached;
  cached = createAdminBaseClient<Database>(
    publicEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey(),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  return cached;
}
