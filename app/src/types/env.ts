/**
 * Strongly-typed runtime env access.
 * - Public vars (NEXT_PUBLIC_*) MUST use direct `process.env.NAME` access so
 *   Next.js can statically inline them into the client bundle — computed
 *   access like `process.env[key]` is left as-is and reads `undefined` in
 *   the browser. Don't refactor publicEnv to use a helper.
 * - Private vars throw at first read on the server if missing — fail fast.
 */

const optional = (key: string): string | undefined => process.env[key] || undefined;

/** Public env — safe to access from anywhere. */
export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Mắt Việt HR",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
};

/**
 * Server-only env. Importing this file from a client component will fail at build
 * because of `import 'server-only'`.
 */
export const serverEnv = {
  msTenantId: () => optional("MS_TENANT_ID"),
  msClientId: () => optional("MS_CLIENT_ID"),
  msClientSecret: () => optional("MS_CLIENT_SECRET"),
  msMailbox: () => optional("MS_MAILBOX_ADDRESS") ?? "hr@matviet.com.vn",
  msTimezone: () => optional("MS_TIMEZONE") ?? "SE Asia Standard Time",
  cronSecret: () => optional("CRON_SECRET"),
  sentryDsn: () => optional("SENTRY_DSN"),
};
