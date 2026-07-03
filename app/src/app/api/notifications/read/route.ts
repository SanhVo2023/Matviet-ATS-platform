import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { markRead } from "@/server/notifications/repository";

export const dynamic = "force-dynamic";

/** POST /api/notifications/read — body {ids?: string[]}; omitted ids = mark all. */
export async function POST(req: Request): Promise<Response> {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let ids: string[] | undefined;
  try {
    const body = (await req.json()) as { ids?: unknown };
    if (Array.isArray(body.ids)) {
      ids = body.ids.filter((v): v is string => typeof v === "string").slice(0, 100);
    }
  } catch {
    // empty body → mark all
  }
  await markRead(profile.id, ids);
  return NextResponse.json({ ok: true });
}
