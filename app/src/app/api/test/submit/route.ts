import { NextResponse } from "next/server";
import { ASSESSMENT_FILE_MAX_BYTES, isAcceptedAssessmentMime } from "@/lib/validation/assessment";
import { recordSubmission } from "@/server/assessments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public POST endpoint — candidate uploads their answer file via /test/[token].
 * No auth: validation goes through token + admin client.
 *
 * Body: multipart with `token` + `file`. PDF only, ≤ 20 MB.
 */
export async function POST(req: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const token = String(formData.get("token") ?? "").trim();
  if (!token || token.length < 16 || token.length > 256) {
    return NextResponse.json({ ok: false, error: "Token không hợp lệ" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Vui lòng chọn file bài làm" }, { status: 400 });
  }
  if (!isAcceptedAssessmentMime(file.type)) {
    return NextResponse.json({ ok: false, error: "Chỉ chấp nhận file PDF" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ ok: false, error: "File trống" }, { status: 400 });
  }
  if (file.size > ASSESSMENT_FILE_MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File quá lớn (tối đa 20 MB)" }, { status: 413 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const result = await recordSubmission(token, {
      buffer,
      mime: file.type,
      originalName: file.name,
      size: file.size,
    });
    return NextResponse.json({ ok: true, submission_id: result.submission_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Không lưu được bài làm";
    // Distinguish auth-style errors (400 / 410) from server errors (500)
    if (
      msg.includes("không hợp lệ") ||
      msg.includes("hết hạn") ||
      msg.includes("đã được sử dụng") ||
      msg.includes("Liên kết")
    ) {
      return NextResponse.json({ ok: false, error: msg }, { status: 410 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
