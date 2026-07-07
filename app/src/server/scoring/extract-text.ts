import "server-only";
import { eq } from "drizzle-orm";
import { extractText, getDocumentProxy } from "unpdf";
import { convertToMarkdown } from "@/lib/ai/to-markdown";
import { getDb } from "@/db";
import { cv_markdowns } from "@/db/schema";

/**
 * Shared CV text extraction (used by the scoring worker AND the upload
 * prefill, ADR 0015): Workers AI toMarkdown first (layout-aware — headings,
 * reading order on multi-column CVs), raw pdf.js text as fallback.
 * Returns "" when nothing could be extracted — callers decide whether
 * that's fatal (scoring) or shrug-worthy (prefill).
 */
export async function extractCvText(
  originalName: string,
  bytes: Uint8Array,
  mime: string,
): Promise<string> {
  let rawText = "";
  try {
    rawText = await convertToMarkdown(originalName, bytes, mime);
  } catch (err) {
    console.warn("[extract-text] toMarkdown failed, falling back to unpdf:", err);
  }
  if (rawText.trim().length < 50 && mime === "application/pdf") {
    try {
      rawText = await extractPdfRaw(bytes);
    } catch {
      // scan-only PDF etc. — return what we have
    }
  }
  return rawText;
}

/** Raw pdf.js extraction. Throws on unreadable PDFs. */
export async function extractPdfRaw(bytes: Uint8Array): Promise<string> {
  const doc = await getDocumentProxy(bytes);
  const { text } = await extractText(doc, { mergePages: true });
  return typeof text === "string" ? text : (text as string[]).join("\n");
}

// ---------------------------------------------------------------------------
// CV → Markdown cache (ADR 0017): ONE conversion per file, shared by
// prefill, scoring, agent search and the dossier. Rows are keyed by
// cv_file_id and cascade-delete with the file; replacing a CV re-converts.
// ---------------------------------------------------------------------------

export const CV_MD_MAX = 50_000;

/** Read the cached markdown for a file — null when missing or not done. */
export async function getCachedCvMarkdown(cvFileId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db
    .select({ md: cv_markdowns.md, status: cv_markdowns.status })
    .from(cv_markdowns)
    .where(eq(cv_markdowns.cv_file_id, cvFileId))
    .limit(1)
    .then((r) => r[0] ?? null);
  return row?.status === "done" && row.md ? row.md : null;
}

/**
 * Upsert the cache row for a file. Pass md=null with an error to record a
 * failed conversion (so the UI can show "Cần xử lý" instead of silence).
 */
export async function storeCvMarkdown(input: {
  cvFileId: string;
  candidateId?: string | null;
  md: string | null;
  engine?: string;
  error?: string | null;
}): Promise<void> {
  const db = await getDb();
  const ok = !!input.md && input.md.trim().length > 0;
  const values = {
    cv_file_id: input.cvFileId,
    candidate_id: input.candidateId ?? null,
    status: (ok ? "done" : "failed") as "done" | "failed",
    md: ok ? input.md!.slice(0, CV_MD_MAX) : null,
    engine: input.engine ?? "workers-ai/toMarkdown",
    error: ok ? null : (input.error ?? "empty extraction"),
  };
  await db
    .insert(cv_markdowns)
    .values(values)
    .onConflictDoUpdate({ target: cv_markdowns.cv_file_id, set: values });
}

/**
 * Cache-first extraction: return the stored markdown, or convert now and
 * write through. This is the ONLY path AI features should use to read a
 * CV — never the PDF directly (ADR 0017).
 */
export async function getOrCreateCvMarkdown(
  cvFileId: string,
  candidateId: string | null,
  loadBytes: () => Promise<{ name: string; bytes: Uint8Array; mime: string } | null>,
): Promise<string> {
  const cached = await getCachedCvMarkdown(cvFileId);
  if (cached) return cached;

  const file = await loadBytes();
  if (!file) return "";
  const md = await extractCvText(file.name, file.bytes, file.mime);
  await storeCvMarkdown({ cvFileId, candidateId, md: md || null }).catch((err) =>
    console.warn("[extract-text] cache write failed:", err),
  );
  return md.slice(0, CV_MD_MAX);
}
