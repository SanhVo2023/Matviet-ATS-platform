import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * R2 file storage accessor (replaces Supabase Storage, ADR 0009).
 * Keys keep the old Supabase path shapes (see src/lib/storage/paths.ts),
 * minus the bucket prefix — one bucket `matviet-hr-files` for everything.
 */
export async function getFilesBucket() {
  const { env } = await getCloudflareContext({ async: true });
  return env.FILES;
}

/** Rejects path traversal / absolute keys before any R2 call. */
export function assertSafeKey(key: string): string {
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    throw new Error(`Khóa tệp không hợp lệ: ${key}`);
  }
  return key;
}

export async function putFile(
  key: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const bucket = await getFilesBucket();
  await bucket.put(assertSafeKey(key), data, {
    httpMetadata: { contentType },
  });
}

export async function getFile(key: string) {
  const bucket = await getFilesBucket();
  return bucket.get(assertSafeKey(key));
}

export async function deleteFile(key: string): Promise<void> {
  const bucket = await getFilesBucket();
  await bucket.delete(assertSafeKey(key));
}
