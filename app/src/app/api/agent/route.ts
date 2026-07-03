/**
 * /api/agent — the staff AI assistant (admin/hr only).
 * Stateless: the client sends the visible conversation; tools execute
 * server-side with the caller's own authorization (ADR 0011/0013).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { runAgentTurn } from "@/server/ai/agent";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(req: Request): Promise<Response> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin" && profile.role !== "hr") {
    return NextResponse.json({ error: "Trợ lý AI hiện chỉ mở cho Admin và HR." }, { status: 403 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await runAgentTurn(profile, parsed.data.messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[agent]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Trợ lý gặp lỗi, thử lại sau." },
      { status: 500 },
    );
  }
}
