import { NextResponse } from "next/server";

/**
 * Shared `Authorization: Bearer ${CRON_SECRET}` gate for internal routes
 * (cron drains, agent sweep/ping, one-time setup). Returns an error Response
 * to short-circuit with, or null when the request is authorized.
 *
 * Was copy-pasted into every route (6 identical constantTimeEqual copies) —
 * a timing-safety fix now lands in one place.
 */
export function requireCronAuth(req: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (!constantTimeEqual(auth, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}
