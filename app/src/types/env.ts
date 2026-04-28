/**
 * Strongly-typed runtime env access.
 * - Public vars (NEXT_PUBLIC_*) are inlined by Next.js into the client bundle.
 * - Private vars throw at first read on the server if missing — fail fast.
 */

const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const optional = (key: string): string | undefined => process.env[key] || undefined;

/** Public env — safe to access from anywhere. */
export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Mắt Việt HR",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  sentryDsn: optional("NEXT_PUBLIC_SENTRY_DSN"),
};

/**
 * Server-only env. Importing this file from a client component will fail at build
 * because of `import 'server-only'`.
 */
export const serverEnv = {
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  msTenantId: () => optional("MS_TENANT_ID"),
  msClientId: () => optional("MS_CLIENT_ID"),
  msClientSecret: () => optional("MS_CLIENT_SECRET"),
  msMailbox: () => optional("MS_MAILBOX_ADDRESS") ?? "hr@matviet.com.vn",
  msTimezone: () => optional("MS_TIMEZONE") ?? "SE Asia Standard Time",
  geminiApiKey: () => optional("GEMINI_API_KEY"),
  geminiModel: () => optional("GEMINI_MODEL") ?? "gemini-2.5-flash",
  libreofficeWorkerUrl: () => optional("LIBREOFFICE_WORKER_URL"),
  libreofficeWorkerSecret: () => optional("LIBREOFFICE_WORKER_SECRET"),
  cronSecret: () => optional("CRON_SECRET"),
  sentryDsn: () => optional("SENTRY_DSN"),
};
