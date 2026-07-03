/**
 * /api/demo-seed — demo/QA fixtures. CRON_SECRET-gated ops utility.
 *
 *   POST   → FULL feature fixtures (accounts per role, jobs, candidates at
 *            every stage, R2 PDFs, interviews, approvals, assessment + public
 *            token, email queue states) + the reports volume seeder.
 *   DELETE → remove what the reports volume seeder created (full fixtures are
 *            removed by dropping demo rows manually — see docs/runbook.md)
 */
import { NextResponse } from "next/server";
import { unseedDemoData } from "@/server/reports/seed-demo";
import { runFullDemoSeed } from "@/server/demo/seed-full";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const enc = new TextEncoder();
  const a = enc.encode(auth);
  const b = enc.encode(`Bearer ${expected}`);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i]! ^ b[i]!;
  return mismatch === 0;
}

export async function POST(req: Request): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const result = await runFullDemoSeed(appUrl);
  if (result.alreadySeeded) {
    return NextResponse.json(
      { ok: false, error: "Demo data đã tồn tại (job DEMO-SALES-01)" },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, ...result });
}

export async function DELETE(req: Request): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await unseedDemoData();
  return NextResponse.json({ ok: true, ...result });
}
