/**
 * Zod schemas + constants for the CSV import flow (TopCV / CareerViet).
 *
 * Lifecycle:
 *   - HR uploads a CSV exported from TopCV or CareerViet for a job.
 *   - parseCsv detects header layout (source-specific patterns + accent-stripped
 *     fuzzy fallback) and maps to ImportedRow[].
 *   - previewImport flags duplicates (by email or normalized phone within the
 *     same job) and validation errors.
 *   - commitImport inserts candidates, optionally fetches CVs from cv_url
 *     (5 concurrent, 10 MB cap, 30s timeout), enqueues scoring per row.
 */

import { z } from "zod";

export const CSV_SOURCES = ["topcv", "careerviet"] as const;
export type CsvSource = (typeof CSV_SOURCES)[number];

export const CSV_MAX_BYTES = 5 * 1024 * 1024; // 5 MB — generous for ~50K rows
export const CSV_MAX_ROWS = 500; // matches the per-job candidate cap
export const CV_FETCH_TIMEOUT_MS = 30 * 1000;
export const CV_FETCH_CONCURRENCY = 5; // CLAUDE.md concurrentUploadsMax

export const CSV_FIELDS = ["full_name", "email", "phone", "cv_url"] as const;
export type CsvField = (typeof CSV_FIELDS)[number];

export const ImportedRowSchema = z.object({
  full_name: z.string().trim().min(2, "Họ tên quá ngắn").max(200),
  email: z.string().trim().email("Email không hợp lệ").nullable(),
  phone: z.string().trim().max(40).nullable(),
  cv_url: z.string().trim().url("Link CV không hợp lệ").nullable(),
  /** Original raw row preserved for audit + later debugging. */
  source_meta: z.record(z.string(), z.unknown()).optional(),
});
export type ImportedRow = z.infer<typeof ImportedRowSchema>;

export const CommitImportOptionsSchema = z.object({
  job_id: z.string().uuid(),
  source: z.enum(CSV_SOURCES),
  /** When false, rows whose cv_url is set are still inserted but the CV is
   * left for HR to attach manually (skips the network fetch — useful when
   * the URLs are TopCV's signed-in-only links). */
  fetch_cvs: z.boolean().default(true),
  /** When true, rows that match an existing candidate (email or phone within
   * the same job) are skipped silently. When false, importer hard-fails. */
  skip_duplicates: z.boolean().default(true),
});
export type CommitImportOptions = z.infer<typeof CommitImportOptionsSchema>;

/**
 * Normalize a Vietnamese phone number for duplicate detection.
 * Strips spaces, dashes, dots, parens; converts +84 → 0; coerces to digits.
 *
 *   "+84 901 234 567"  → "0901234567"
 *   "0901-234-567"     → "0901234567"
 *   "(090) 1234567"    → "0901234567"
 *
 * Returns empty string if input is empty / contains no digits.
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/[\s\-().]/g, "").replace(/^\+84/, "0");
  return digits.replace(/\D/g, "");
}

/**
 * Strip Vietnamese diacritics from a string for accent-insensitive comparison.
 * "Họ và tên" → "Ho va ten"
 */
export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
