import type { D1Database, R2Bucket, Fetcher, Ai, Queue } from "@cloudflare/workers-types";

declare global {
  /** Bindings + secrets available on the Worker (wrangler.jsonc + `wrangler secret put`). */
  interface CloudflareEnv {
    DB: D1Database;
    FILES: R2Bucket;
    AI: Ai;
    SCORING_QUEUE: Queue;
    /** HiringAgent Durable Objects — one instance per job opening (ADR 0020). */
    HIRING_AGENT: import("@cloudflare/workers-types").DurableObjectNamespace;
    /** Self service binding — DO alarms call the app's own /api routes. */
    SELF: Fetcher;
    /** Cloudflare Email Service `send_email` binding (object-payload send API). */
    EMAIL?: import("@/lib/email/cloudflare").CloudflareEmailBinding;
    ASSETS: Fetcher;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_APP_NAME?: string;
    EMAIL_FROM_ADDRESS?: string;
    EMAIL_FROM_NAME?: string;
    AI_MODEL?: string;
    MS_TENANT_ID?: string;
    MS_CLIENT_ID?: string;
    MS_CLIENT_SECRET?: string;
    MS_MAILBOX_ADDRESS?: string;
    CRON_SECRET?: string;
    BETTER_AUTH_SECRET?: string;
    /** Web Push (VAPID). Public key is a var; private key is a secret. */
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    VAPID_SUBJECT?: string;
  }
}

export {};
