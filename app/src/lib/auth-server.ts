import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { deliverMail } from "@/server/email/transport";
import { emailCtaButton } from "@/server/email/layout";
import { checkLockout, recordFailure, clearFailures } from "@/server/auth/lockout";

/**
 * better-auth on D1 (ADR 0010).
 * - email/password only; public sign-up disabled (admin creates accounts)
 * - 30-day sliding sessions (supersedes the old 8h baseline — see build-log 2026-07-07)
 * - NO cookieCache: session state is read from D1 on every request so
 *   deactivation/ban/revocation take effect immediately (renovation R0 — the
 *   old 5-minute cache left "revoked" users with live access)
 * - rate limiting is DATABASE-backed (`rate_limits` table) — the default
 *   in-memory Map is per-isolate on Workers and never accumulates
 * - per-email lockout via hooks (5 fails/15min → escalating lock; see
 *   server/auth/lockout.ts)
 * - password-reset email goes through the shared mail transport (Cloudflare
 *   Email Service first, MS Graph fallback — see server/email/transport.ts).
 *   Pass a `mailError` ref to observe delivery failures: better-auth swallows
 *   the throw internally (logged only), so callers that want to surface
 *   "email didn't send" read the ref after the API call.
 *
 * The instance is created per call: on Workers each isolate is short-lived and
 * betterAuth() construction is cheap; the D1 binding must come from the live
 * request context anyway.
 */

export interface MailErrorRef {
  current: string | null;
}

export async function getAuth(opts?: { mailError?: MailErrorRef }) {
  const db = await getDb();
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rate_limits,
      },
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    // Both hosts stay usable during the domain transition — the canonical
    // hr.matviet.com.vn plus the workers.dev fallback URL.
    trustedOrigins: ["https://hr.matviet.com.vn", "https://matviet-hr.gentle-sky-3b0e.workers.dev"],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        try {
          await deliverMail({
            to: [user.email],
            subject: "Đặt lại mật khẩu — Mắt Việt HR",
            bodyHtml: `
            <p>Chào ${user.name || "bạn"},</p>
            <p>Bạn (hoặc quản trị viên) vừa yêu cầu đặt lại mật khẩu cho tài khoản Mắt Việt HR.</p>
            ${emailCtaButton(url, "Đặt mật khẩu mới")}
            <p>Liên kết hết hạn sau 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
          });
        } catch (err) {
          if (opts?.mailError) {
            opts.mailError.current = err instanceof Error ? err.message : String(err);
          }
          throw err;
        }
      },
      resetPasswordTokenExpiresIn: 60 * 60,
    },
    session: {
      // 30-day sliding sessions (Sanh 2026-07-07 — the original 8h baseline
      // logged everyone out overnight; for a 5-user internal tool "stay
      // logged in" wins).
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60, // refresh the expiry at most daily while in use
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "hr", input: false },
        phone: { type: "string", required: false },
        departmentId: { type: "string", required: false },
        isActive: { type: "boolean", defaultValue: true, input: false },
      },
    },
    plugins: [
      admin({
        adminRoles: ["admin"],
        defaultRole: "hr",
      }),
    ],
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 15 * 60,
      max: 20,
      customRules: {
        // 5 attempts / 15 min per IP; the per-email lockout below covers the
        // distributed-IP case.
        "/sign-in/email": { window: 15 * 60, max: 5 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const email = String((ctx.body as { email?: string } | undefined)?.email ?? "");
        if (!email) return;
        const lockedMinutes = await checkLockout(email);
        if (lockedMinutes > 0) {
          throw new APIError("TOO_MANY_REQUESTS", {
            message: `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Thử lại sau ${lockedMinutes} phút.`,
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const email = String((ctx.body as { email?: string } | undefined)?.email ?? "");
        if (!email) return;
        const returned = ctx.context.returned;
        const isFailure = returned instanceof APIError;
        // 429s (rate limit / our own lockout) are not password failures.
        if (isFailure && returned.statusCode === 429) return;
        try {
          if (isFailure) await recordFailure(email);
          else await clearFailures(email);
        } catch (err) {
          console.warn("[auth] lockout ledger update failed", err);
        }
      }),
    },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      ipAddress: {
        // Cloudflare's trusted client-IP header — without this the limiter
        // falls back to x-forwarded-for and can collapse all clients into one
        // shared bucket (trivial lockout DoS).
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
    },
  });
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
