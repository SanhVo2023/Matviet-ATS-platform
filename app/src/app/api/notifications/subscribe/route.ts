import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { deletePushSubscription, upsertPushSubscription } from "@/server/notifications/repository";

export const dynamic = "force-dynamic";

/** POST — register this browser's PushSubscription for the signed-in user. */
export async function POST(req: Request): Promise<Response> {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await upsertPushSubscription(
    profile.id,
    { endpoint, p256dh, auth },
    req.headers.get("user-agent"),
  );
  return NextResponse.json({ ok: true });
}

/** DELETE — body {endpoint} — drop this browser's subscription. */
export async function DELETE(req: Request): Promise<Response> {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let endpoint = "";
  try {
    const body = (await req.json()) as { endpoint?: unknown };
    if (typeof body.endpoint === "string") endpoint = body.endpoint;
  } catch {
    // fallthrough
  }
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  await deletePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
