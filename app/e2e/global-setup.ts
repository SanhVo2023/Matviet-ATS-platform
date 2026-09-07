/**
 * Runs once after the web server is up, before any spec:
 *
 * 1. Upserts a deterministic e2e admin (E2E_EMAIL / E2E_PASSWORD below)
 *    directly into the LOCAL D1 via `wrangler d1 execute --local`, hashing the
 *    password with better-auth's exact scrypt parameters — so login specs
 *    never depend on the (random) demo-seed password.
 * 2. Tries POST /api/demo-seed (CRON_SECRET + ALLOW_DEMO_SEED gated) and
 *    stashes the response in e2e/.seed.json for specs that want fixture URLs.
 *    409 (already seeded) and 403 (guard off) are fine — specs degrade.
 *
 * LOCAL DEV DATABASE ONLY — nothing here can reach production.
 */
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const E2E_EMAIL = "e2e-admin@matviet.test";
export const E2E_PASSWORD = "E2eAdmin@2026!";

const APP_DIR = join(__dirname, "..");
const BASE_URL = "http://localhost:3000";

// better-auth scrypt config (@better-auth/utils/password) — do not change.
const SCRYPT = { N: 16384, r: 16, p: 1, dkLen: 64 };
function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) =>
    scrypt(
      password.normalize("NFKC"),
      salt,
      SCRYPT.dkLen,
      { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 128 * SCRYPT.N * SCRYPT.r * 2 },
      (err, key) => (err ? reject(err) : resolve(`${salt}:${key.toString("hex")}`)),
    ),
  );
}

function d1Local(sql: string): void {
  const dir = mkdtempSync(join(tmpdir(), "mvhr-e2e-"));
  const file = join(dir, "setup.sql");
  writeFileSync(file, sql, "utf8");
  try {
    // shell:true — Node refuses to spawn npx.cmd directly on Windows (EINVAL,
    // CVE-2024-27980 hardening). Args are fixed strings + a quoted temp path.
    execFileSync(
      "npx",
      ["wrangler", "d1", "execute", "matviet-hr", "--local", `--file="${file}"`],
      {
        cwd: APP_DIR,
        stdio: "pipe",
        shell: true,
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function upsertE2eAdmin(): Promise<void> {
  const hash = await hashPassword(E2E_PASSWORD);
  const userId = randomUUID();
  const accountId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  d1Local(`
INSERT INTO users (id, name, email, email_verified, role, is_active, banned, created_at, updated_at)
VALUES (${q(userId)}, 'E2E Admin', ${q(E2E_EMAIL)}, 1, 'admin', 1, 0, ${now}, ${now})
ON CONFLICT (email) DO UPDATE SET is_active = 1, banned = 0, role = 'admin';
DELETE FROM accounts WHERE provider_id = 'credential'
  AND user_id = (SELECT id FROM users WHERE email = ${q(E2E_EMAIL)});
INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
SELECT ${q(accountId)}, id, id, 'credential', ${q(hash)}, ${now}, ${now}
FROM users WHERE email = ${q(E2E_EMAIL)};
-- Clean slate for the throttles: the DB-backed IP rate limit and the
-- per-email lockout persist across runs and would 429 the suite otherwise.
DELETE FROM rate_limits;
DELETE FROM login_attempts;
`);
}

async function trySeedFixtures(): Promise<void> {
  const secret = process.env.CRON_SECRET ?? readDevVar("CRON_SECRET");
  if (!secret) {
    console.warn("[e2e-setup] no CRON_SECRET — skipping demo seed");
    return;
  }
  try {
    const res = await fetch(`${BASE_URL}/api/demo-seed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(120_000),
    });
    const body: unknown = await res.json().catch(() => ({}));
    writeFileSync(
      join(__dirname, ".seed.json"),
      JSON.stringify({ status: res.status, body }, null, 2),
      "utf8",
    );
    console.log(`[e2e-setup] demo-seed -> ${res.status}`);
  } catch (err) {
    console.warn("[e2e-setup] demo-seed unreachable:", err);
  }
}

function readDevVar(name: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    const content = fs.readFileSync(join(APP_DIR, ".dev.vars"), "utf8");
    const line = content.split("\n").find((l: string) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim() : null;
  } catch {
    return null;
  }
}

/** `next dev` compiles routes on first hit — pay that cost ONCE here instead
 * of inside every spec's 30s budget (Windows first-compiles run 20-60s). */
async function warmRoutes(): Promise<void> {
  const routes = [
    "/dang-nhap",
    "/tuyen-dung",
    "/",
    "/ung-vien",
    "/test/warmup-token",
    "/nhan-viec/warmup-token",
    "/dat-lai-mat-khau",
  ];
  for (const route of routes) {
    const started = Date.now();
    try {
      await fetch(`${BASE_URL}${route}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(120_000),
      });
      console.log(`[e2e-setup] warmed ${route} in ${Date.now() - started}ms`);
    } catch (err) {
      console.warn(`[e2e-setup] warmup ${route} failed:`, err);
    }
  }
  // Compile the sign-in API route too (a cold first POST otherwise blows the
  // login test's budget). Bad creds -> fast 401 once compiled.
  try {
    const started = Date.now();
    await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "warmup@matviet.test", password: "warmup-not-real" }),
      signal: AbortSignal.timeout(120_000),
    });
    console.log(`[e2e-setup] warmed sign-in route in ${Date.now() - started}ms`);
  } catch (err) {
    console.warn("[e2e-setup] sign-in warmup failed:", err);
  }
}

export default async function globalSetup(): Promise<void> {
  await upsertE2eAdmin();
  await trySeedFixtures();
  await warmRoutes();
  // Warm-up traffic (incl. a bad-creds sign-in POST) spent rate-limit budget
  // and wrote a login_attempts row — clear both so the suite starts with the
  // full 5-per-15min sign-in allowance from localhost.
  d1Local("DELETE FROM rate_limits; DELETE FROM login_attempts;");
}
