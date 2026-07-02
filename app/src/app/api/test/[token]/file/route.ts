import { eq, gt, and } from "drizzle-orm";
import { getDb } from "@/db";
import { assessments, assessment_invite_tokens } from "@/db/schema";
import { getFile } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Public GET endpoint — anonymous candidate downloads the test (đề bài) file
 * from /test/[token]. No session: authorization is the invite token itself.
 * 404 on invalid/expired token or missing file (no internal hints).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!token || token.length < 16 || token.length > 256) {
    return new Response("Not found", { status: 404 });
  }

  const db = await getDb();
  const invite = await db
    .select({
      assessment_id: assessment_invite_tokens.assessment_id,
    })
    .from(assessment_invite_tokens)
    .where(
      and(
        eq(assessment_invite_tokens.token, token),
        gt(assessment_invite_tokens.expires_at, new Date().toISOString()),
      ),
    )
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!invite) return new Response("Not found", { status: 404 });

  const assessment = await db
    .select({
      test_storage_path: assessments.test_storage_path,
      original_name: assessments.original_name,
    })
    .from(assessments)
    .where(eq(assessments.id, invite.assessment_id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!assessment?.test_storage_path) return new Response("Not found", { status: 404 });

  const obj = await getFile(assessment.test_storage_path);
  if (!obj) return new Response("Not found", { status: 404 });

  const originalName = assessment.original_name ?? "de-bai.pdf";
  const headers = new Headers();
  // DOM Headers vs workers-types Headers are runtime-identical here.
  obj.writeHttpMetadata(headers as unknown as Parameters<typeof obj.writeHttpMetadata>[0]);
  headers.set("content-disposition", `attachment; filename="${encodeURIComponent(originalName)}"`);
  return new Response(obj.body as ReadableStream, { headers });
}
