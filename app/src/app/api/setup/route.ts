/**
 * /api/setup — one-time first-admin bootstrap.
 *
 * Sign-up is disabled (ADR 0010) and admin-created accounts require an admin
 * session — chicken-and-egg for the very first account. This route breaks the
 * cycle: ONLY when the users table is empty, and ONLY with the CRON_SECRET
 * bearer, it creates the initial admin account.
 *
 * Usage (local or prod, once):
 *   curl -X POST https://<host>/api/setup \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "content-type: application/json" \
 *     -d '{"email":"sanh.vlt@matkinh.com.vn","password":"...","name":"Sanh Võ"}'
 */
import { NextResponse } from "next/server";
import { count } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users, accounts } from "@/db/schema";
import { getAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (!constantTimeEqual(auth, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const existing = await db.select({ n: count() }).from(users).get();
  if ((existing?.n ?? 0) > 0) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 409 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  // Hash with better-auth's own scrypt context so normal sign-in verifies it.
  const authInstance = await getAuth();
  const ctx = await authInstance.$context;
  const passwordHash = await ctx.password.hash(password);

  const now = new Date();
  const userId = crypto.randomUUID();
  await db.batch([
    db.insert(users).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(accounts).values({
      id: crypto.randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  return NextResponse.json({ ok: true, userId, email, role: "admin" });
}

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let mismatch = 0;
  for (let i = 0; i < aBytes.length; i++) mismatch |= aBytes[i]! ^ bBytes[i]!;
  return mismatch === 0;
}
