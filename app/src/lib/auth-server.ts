import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { deliverMail } from "@/server/email/transport";
import { emailCtaButton } from "@/server/email/layout";

/**
 * better-auth on D1 (ADR 0010).
 * - email/password only; public sign-up disabled (admin creates accounts)
 * - 30-day sliding sessions (supersedes the old 8h baseline — see build-log 2026-07-07)
 * - `users` carries the old `profiles` fields as additionalFields
 * - password-reset email goes through the shared mail transport (Cloudflare
 *   Email Service first, MS Graph fallback — see server/email/transport.ts)
 *
 * The instance is created per call: on Workers each isolate is short-lived and
 * betterAuth() construction is cheap; the D1 binding must come from the live
 * request context anyway.
 */
export async function getAuth() {
  const db = await getDb();
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
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
        await deliverMail({
          to: [user.email],
          subject: "Đặt lại mật khẩu — Mắt Việt HR",
          bodyHtml: `
            <p>Chào ${user.name || "bạn"},</p>
            <p>Bạn (hoặc quản trị viên) vừa yêu cầu đặt lại mật khẩu cho tài khoản Mắt Việt HR.</p>
            ${emailCtaButton(url, "Đặt mật khẩu mới")}
            <p>Liên kết hết hạn sau 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
        });
      },
      resetPasswordTokenExpiresIn: 60 * 60,
    },
    session: {
      // 30-day sliding sessions (Sanh 2026-07-07 — the original 8h baseline
      // logged everyone out overnight; for a 5-user internal tool "stay
      // logged in" wins. Deactivating a user still revokes their sessions
      // instantly via setUserActive.)
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60, // refresh the expiry at most daily while in use
      cookieCache: { enabled: true, maxAge: 5 * 60 },
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
      window: 15 * 60,
      max: 20,
      customRules: {
        // 5 attempts / 15 min per IP (baseline). Per-email lockout is a G11
        // TODO — better-auth keys on ip+path only (see build-log 2026-07-02).
        "/sign-in/email": { window: 15 * 60, max: 5 },
      },
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
