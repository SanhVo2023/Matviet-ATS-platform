/**
 * /api/files/[...path] — authed R2 file streaming.
 *
 * Replaces Supabase Storage signed URLs after the Cloudflare pivot (ADR 0009):
 * instead of a time-limited signed URL, files are streamed through this route
 * behind the app session. Keys are the old storage paths unchanged
 * (see src/lib/storage/paths.ts), e.g. `{candidate_id}/{slug}.pdf`.
 */
import { getCurrentProfile } from "@/lib/auth";
import { assertSafeKey, getFile } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { path } = await params;
  let key: string;
  try {
    key = assertSafeKey(path.map((segment) => decodeURIComponent(segment)).join("/"));
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const obj = await getFile(key);
  if (!obj) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  // DOM Headers vs workers-types Headers are runtime-identical here.
  obj.writeHttpMetadata(headers as unknown as Parameters<typeof obj.writeHttpMetadata>[0]);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "private, max-age=300");
  return new Response(obj.body as ReadableStream, { headers });
}
