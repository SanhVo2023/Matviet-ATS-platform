/**
 * POST /api/emails/{id}/send — manual "Gửi ngay" trigger from the queue page.
 *
 * Auth: HR/admin session. Calls service.sendNow which talks to MS Graph
 * synchronously (NOT cron-protected). Useful when HR doesn't want to wait
 * for the next 5-minute drain tick.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { sendNow } from "@/server/email/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await requireRole(["admin", "hr"]);
  const { id } = await params;
  try {
    const outcome = await sendNow(id);
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json(
      { result: "failed", error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
