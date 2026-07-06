import { NextResponse } from "next/server";
import { respondToOffer } from "@/server/offers/service";

export const dynamic = "force-dynamic";

/** POST /api/offer/respond — public; the offer token IS the authorization. */
export async function POST(req: Request): Promise<Response> {
  let body: {
    token?: unknown;
    decision?: unknown;
    expected_start_date?: unknown;
    note?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const decision =
    body.decision === "accepted" || body.decision === "declined" ? body.decision : null;
  if (!token || !decision) {
    return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const result = await respondToOffer(token, {
    decision,
    expected_start_date:
      typeof body.expected_start_date === "string" ? body.expected_start_date : null,
    note: typeof body.note === "string" ? body.note : null,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
