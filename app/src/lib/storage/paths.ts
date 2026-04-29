/**
 * Storage path helpers. Centralizes the file-naming convention so neither
 * the upload action nor the RLS policy has to duplicate the rule.
 *
 * Bucket layout:
 *   cvs/{candidate_id}/{slug}.{ext}
 *   assessments/{assessment_id}/test-{slug}.{ext}
 *   submissions/{submission_id}/answer-{slug}.{ext}
 *
 * The candidate_id namespace prevents path traversal — every path starts with
 * a UUID we generate server-side, never a user-controlled string.
 */

const FILENAME_MAX = 80;

/**
 * Slug a Vietnamese filename into ASCII-safe bytes for Storage. Preserves the
 * extension. Vietnamese diacritics are stripped (we keep the original_name
 * separately in cv_files for display).
 */
export function slugifyFilename(name: string): string {
  // Strip diacritics: NFD splits "Nguyễn" → "N e ̃ u y e ̂ n", then drop combining marks.
  const noDiacritics = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const dotIdx = noDiacritics.lastIndexOf(".");
  const base = dotIdx > 0 ? noDiacritics.slice(0, dotIdx) : noDiacritics;
  const ext = dotIdx > 0 ? noDiacritics.slice(dotIdx + 1).toLowerCase() : "";

  const cleanBase = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, FILENAME_MAX);
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 8);

  if (!cleanBase) return safeExt ? `file.${safeExt}` : "file";
  return safeExt ? `${cleanBase}.${safeExt}` : cleanBase;
}

export function cvStoragePath(candidateId: string, originalName: string): string {
  return `${candidateId}/${slugifyFilename(originalName)}`;
}

/**
 * Whitelist of MIME types accepted by the cvs bucket.
 * v1: PDF only — DOCX deferred until the LibreOffice worker on Fly.io is live.
 * Re-add `.docx` and `application/msword` once `LIBREOFFICE_WORKER_URL` is set.
 */
export const CV_ACCEPTED_MIMES = ["application/pdf"] as const;

/** Mirror of the bucket file_size_limit (10 MB). Validated server-side. */
export const CV_MAX_BYTES = 10 * 1024 * 1024;

export type CvMime = (typeof CV_ACCEPTED_MIMES)[number];

export function isAcceptedCvMime(mime: string): mime is CvMime {
  return (CV_ACCEPTED_MIMES as readonly string[]).includes(mime);
}
