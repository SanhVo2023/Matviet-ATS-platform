import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CV_FETCH_CONCURRENCY,
  CV_FETCH_TIMEOUT_MS,
  type CommitImportOptions,
  type ImportedRow,
} from "@/lib/validation/csv-import";
import { CV_MAX_BYTES, cvStoragePath, isAcceptedCvMime } from "@/lib/storage/paths";
import { enqueueScoring } from "@/server/scoring/repository";
import { triggerEdgeFunction } from "@/server/scoring/orchestration";
import { findExistingByEmailOrPhone } from "@/server/csv-import/repository";
import type { TablesInsert } from "@/types/db";

// Re-export the pure parser so legacy callers keep working
export { parseCsv, ALL_FIELDS, normalizeHeader, type ParseResult } from "./parser";

type CandidateInsert = TablesInsert<"candidates">;
type CvFileInsert = TablesInsert<"cv_files">;

// ──────────────────────────── Preview ────────────────────────────

export interface PreviewedRow {
  row: ImportedRow;
  duplicate_match: { id: string; full_name: string } | null;
}

export async function previewImport(jobId: string, rows: ImportedRow[]): Promise<PreviewedRow[]> {
  // Concurrency-limited duplicate scan (5 at a time)
  const out: PreviewedRow[] = new Array(rows.length);
  const queue = rows.map((row, i) => ({ row, i }));
  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      const { row, i } = queue[cursor++]!;
      const dup = await findExistingByEmailOrPhone(jobId, row.email, row.phone);
      out[i] = { row, duplicate_match: dup };
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  return out;
}

// ──────────────────────────── Commit ────────────────────────────

export interface CommitResult {
  inserted: number;
  skipped_duplicates: number;
  failed: number;
  errors: Array<{ row_index: number; full_name: string; error: string }>;
  inserted_candidate_ids: string[];
}

/**
 * Commit parsed rows: bulk-insert candidates, optionally fetch CVs from
 * cv_url, enqueue scoring per row.
 *
 * Uses admin client for bulk inserts (RLS-bypass for performance + uniformity).
 * The calling Server Action MUST guard with requireRole(['admin','hr']).
 *
 * Per-row failures don't abort the whole import — failed rows accumulate in
 * the result; HR sees the summary and can retry individual rows manually.
 */
export async function commitImport(
  rows: ImportedRow[],
  options: CommitImportOptions,
  actorId: string,
): Promise<CommitResult> {
  const admin = createAdminClient();
  const result: CommitResult = {
    inserted: 0,
    skipped_duplicates: 0,
    failed: 0,
    errors: [],
    inserted_candidate_ids: [],
  };

  // Filter duplicates first (one DB call per row, bounded by concurrency).
  // Duplicates are silently skipped if options.skip_duplicates; otherwise we
  // hard-fail at the first duplicate.
  const previewed = await previewImport(options.job_id, rows);

  const toInsert: Array<{ row: ImportedRow; index: number }> = [];
  for (let i = 0; i < previewed.length; i++) {
    const p = previewed[i]!;
    if (p.duplicate_match) {
      if (options.skip_duplicates) {
        result.skipped_duplicates += 1;
      } else {
        result.failed += 1;
        result.errors.push({
          row_index: i,
          full_name: p.row.full_name,
          error: `Trùng ứng viên đã tồn tại (${p.duplicate_match.full_name})`,
        });
      }
      continue;
    }
    toInsert.push({ row: p.row, index: i });
  }

  // Bulk insert candidates with pre-allocated UUIDs so we can correlate
  // post-insert work (CV download, scoring enqueue) without an extra read.
  const candidateInserts: Array<CandidateInsert & { id: string }> = toInsert.map((t) => ({
    id: crypto.randomUUID(),
    job_id: options.job_id,
    full_name: t.row.full_name,
    email: t.row.email,
    phone: t.row.phone,
    source: options.source === "topcv" ? "csv_import" : "csv_import",
    notes: t.row.cv_url ? null : "Bổ sung CV sau",
    current_stage: "new",
    created_by: actorId,
  }));

  if (candidateInserts.length === 0) {
    return result;
  }

  const { error: bulkErr } = await admin.from("candidates").insert(candidateInserts as never);
  if (bulkErr) {
    // Fall back to per-row inserts so partial failures don't block everything
    for (let i = 0; i < candidateInserts.length; i++) {
      const c = candidateInserts[i]!;
      const { error } = await admin.from("candidates").insert(c as never);
      const original = toInsert[i]!;
      if (error) {
        result.failed += 1;
        result.errors.push({
          row_index: original.index,
          full_name: c.full_name,
          error: error.message,
        });
      } else {
        result.inserted += 1;
        result.inserted_candidate_ids.push(c.id);
      }
    }
  } else {
    result.inserted = candidateInserts.length;
    result.inserted_candidate_ids = candidateInserts.map((c) => c.id);
  }

  // CV downloads — only for candidates with a cv_url AND fetch_cvs option
  if (options.fetch_cvs) {
    const downloadQueue = toInsert
      .map((t, i) => ({ t, candidateId: candidateInserts[i]!.id }))
      .filter(
        (entry) => entry.t.row.cv_url && result.inserted_candidate_ids.includes(entry.candidateId),
      );

    let cursor = 0;
    async function worker() {
      while (cursor < downloadQueue.length) {
        const entry = downloadQueue[cursor++]!;
        try {
          await fetchAndAttachCv(entry.candidateId, entry.t.row.cv_url!, actorId);
        } catch (err) {
          // Don't fail the whole import — candidate stays with cv_file_id=null
          // and "Bổ sung CV sau" note. HR can manually attach later.
          await admin
            .from("candidates")
            .update({ notes: `CV tự động tải lỗi: ${(err as Error).message}` } as never)
            .eq("id", entry.candidateId);
        }
      }
    }
    await Promise.all(Array.from({ length: CV_FETCH_CONCURRENCY }, worker));
  }

  // Enqueue scoring for every successfully inserted candidate (regardless of
  // CV download outcome — CVs that came in late will still fire when re-uploaded).
  for (const cid of result.inserted_candidate_ids) {
    try {
      await enqueueScoring(cid, actorId);
      triggerEdgeFunction(cid);
    } catch {
      /* drain cron will pick up later */
    }
  }

  return result;
}

// ──────────────────────────── CV download helper ────────────────────────────

async function fetchAndAttachCv(
  candidateId: string,
  cvUrl: string,
  uploadedBy: string,
): Promise<void> {
  const admin = createAdminClient();

  // Fetch with timeout
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CV_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(cvUrl, { signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  // Tolerate URL-with-charset like "application/pdf; charset=binary"
  const mime = contentType.split(";")[0]!.trim();
  if (!isAcceptedCvMime(mime)) {
    throw new Error(`Loại file ${mime || "không xác định"} chưa hỗ trợ`);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength === 0) throw new Error("File trống");
  if (buffer.byteLength > CV_MAX_BYTES) throw new Error("File quá lớn (> 10 MB)");

  // Derive filename from URL or fall back to candidate id
  const urlPath = new URL(cvUrl).pathname;
  const filenameGuess = urlPath.split("/").pop() ?? `cv-${candidateId}.pdf`;
  const originalName = filenameGuess.toLowerCase().endsWith(".pdf")
    ? filenameGuess
    : `${filenameGuess}.pdf`;
  const storagePath = cvStoragePath(candidateId, originalName);

  const { error: upErr } = await admin.storage
    .from("cvs")
    .upload(storagePath, buffer, { contentType: mime, upsert: false });
  if (upErr) throw new Error(`Lưu vào Storage thất bại: ${upErr.message}`);

  const cvInsert: CvFileInsert = {
    storage_path: storagePath,
    mime,
    size_bytes: buffer.byteLength,
    original_name: originalName,
    uploaded_by: uploadedBy,
  };
  const { data: cv, error: cvErr } = await admin
    .from("cv_files")
    .insert(cvInsert as never)
    .select("id")
    .single();
  if (cvErr || !cv) {
    await admin.storage
      .from("cvs")
      .remove([storagePath])
      .catch(() => {});
    throw cvErr ?? new Error("cv_files insert failed");
  }
  const cvFileId = (cv as { id: string }).id;

  await admin
    .from("candidates")
    .update({ cv_file_id: cvFileId, notes: null } as never)
    .eq("id", candidateId);
}
