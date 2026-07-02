/**
 * /api/demo-seed — load/remove the reports demo dataset (G10 seeder).
 * CRON_SECRET-gated ops utility (the old entry point was a Node script that
 * died with the Supabase decommission).
 *
 *   POST   → seed ~120 demo candidates across demo jobs
 *   DELETE → remove everything the seeder created
 */
import { NextResponse } from "next/server";
import { seedDemoData, unseedDemoData } from "@/server/reports/seed-demo";

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
  const result = await seedDemoData();
  return NextResponse.json({ ok: true, ...result });
}

export async function DELETE(req: Request): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await unseedDemoData();
  return NextResponse.json({ ok: true, ...result });
}
