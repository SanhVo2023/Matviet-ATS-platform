import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import { convertToMarkdown } from "@/lib/ai/to-markdown";

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
