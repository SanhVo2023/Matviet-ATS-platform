import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { listForUser } from "@/server/notifications/repository";
import { getVapidPublicKey } from "@/server/notifications/push";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications — bell dropdown payload.
 * Returns 401 (not a redirect) so the polling client and the service worker
 * can handle expired sessions gracefully.
 */
export async function GET(req: Request): Promise<Response> {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

  const { unread, items } = await listForUser(profile.id, limit);
  return NextResponse.json(
    { unread, items, pushKey: await getVapidPublicKey() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
