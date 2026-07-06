import { NextResponse } from "next/server";
import { submitPublicApplication } from "@/server/apply/service";

export const dynamic = "force-dynamic";

/** Reject obviously-automated submissions before touching the DB. */
const MIN_FILL_MS = 3000;

/**
 * POST /api/apply — public careers-page application (multipart).
 * Anti-spam: honeypot field + minimum fill time here; per-IP rate limit and
 * duplicate detection in the service.
 */
export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const str = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v : "";
  };

  // Honeypot filled or form submitted inhumanly fast → pretend success
  // (don't teach bots what tripped them).
  const openedAt = Number(str("opened_at"));
  const tooFast = Number.isFinite(openedAt) && openedAt > 0 && Date.now() - openedAt < MIN_FILL_MS;
  if (str("website").trim() !== "" || tooFast) {
    return NextResponse.json({ ok: true });
  }

  const jobId = str("job_id");
  const fullName = str("full_name").trim();
  const email = str("email").trim();
  const phone = str("phone").trim();
  const consent = str("consent") === "yes";
  const file = form.get("file");

  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    return NextResponse.json({ ok: false, error: "Vị trí không hợp lệ" }, { status: 400 });
  }
  if (fullName.length < 2 || fullName.length > 120) {
    return NextResponse.json({ ok: false, error: "Vui lòng nhập họ tên" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) {
    return NextResponse.json({ ok: false, error: "Email không hợp lệ" }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 8 || phone.length > 20) {
    return NextResponse.json({ ok: false, error: "Số điện thoại không hợp lệ" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng đồng ý điều khoản xử lý dữ liệu cá nhân" },
      { status: 400 },
    );
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Vui lòng đính kèm CV (PDF)" }, { status: 400 });
  }

  const result = await submitPublicApplication(
    {
      job_id: jobId,
      full_name: fullName,
      email,
      phone,
      ip: req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown",
      user_agent: req.headers.get("user-agent"),
    },
    {
      buffer: await file.arrayBuffer(),
      mime: file.type,
      originalName: file.name,
      size: file.size,
    },
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
