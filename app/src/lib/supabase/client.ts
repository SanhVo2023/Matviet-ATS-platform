/**
 * Browser-side Supabase client.
 * Use from "use client" components.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db";
import { publicEnv } from "@/types/env";

export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
