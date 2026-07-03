import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Document → Markdown via the Workers AI conversion utility (ADR 0013 addendum).
 *
 * Why Markdown instead of raw text extraction:
 * - layout-aware: two-column/styled CVs come out in reading order with
 *   headings/lists preserved — dramatically better LLM input than pdf.js text
 * - multi-format: PDF, DOCX/XLSX, HTML, images (OCR'd) — one call each
 * - free for document formats (images may consume vision-model neurons)
 *
 * The caller should still keep a plain-text fallback (unpdf) for resilience.
 */

interface ToMarkdownResult {
  name?: string;
  mimeType?: string;
  format?: string;
  tokens?: number;
  data?: string;
}

export async function convertToMarkdown(
  name: string,
  bytes: Uint8Array,
  mime: string,
): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const ai = env.AI as unknown as {
    toMarkdown?: (
      docs: Array<{ name: string; blob: Blob }> | { name: string; blob: Blob },
    ) => Promise<ToMarkdownResult[] | ToMarkdownResult>;
  };
  if (!ai?.toMarkdown) {
    throw new Error("env.AI.toMarkdown không khả dụng (cần Workers AI binding).");
  }

  const blob = new Blob([bytes as BlobPart], { type: mime });
  const result = await ai.toMarkdown([{ name, blob }]);
  const first: ToMarkdownResult | undefined = Array.isArray(result) ? result[0] : result;
  const markdown = first?.data?.trim() ?? "";
  if (!markdown) {
    throw new Error(`toMarkdown trả về rỗng cho ${name} (${mime}).`);
  }
  return markdown;
}

/** Mimes the conversion layer accepts for CV ingestion. */
export const CONVERTIBLE_CV_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
] as const;
