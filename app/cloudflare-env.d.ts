import type { D1Database, R2Bucket, Fetcher } from "@cloudflare/workers-types";

declare global {
  /** Bindings + secrets available on the Worker (wrangler.jsonc + `wrangler secret put`). */
  interface CloudflareEnv {
    DB: D1Database;
    FILES: R2Bucket;
    ASSETS: Fetcher;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_APP_NAME?: string;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    MS_TENANT_ID?: string;
    MS_CLIENT_ID?: string;
    MS_CLIENT_SECRET?: string;
    MS_MAILBOX_ADDRESS?: string;
    CRON_SECRET?: string;
    BETTER_AUTH_SECRET?: string;
  }
}

export {};
