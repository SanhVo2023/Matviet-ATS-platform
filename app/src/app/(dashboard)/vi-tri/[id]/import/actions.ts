"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  CSV_MAX_BYTES,
  CSV_SOURCES,
  CommitImportOptionsSchema,
  ImportedRowSchema,
  type CsvSource,
} from "@/lib/validation/csv-import";
import {
  commitImport,
  parseCsv,
  previewImport,
  type CommitResult,
  type ParseResult,
  type PreviewedRow,
} from "@/server/csv-import/service";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const PreviewArgsSchema = z.object({
  job_id: z.string().uuid(),
  source: z.enum(CSV_SOURCES),
});

export interface PreviewResponse {
  parse: ParseResult;
  duplicates: PreviewedRow[];
}

/**
 * Parse CSV + flag duplicates. No DB writes. Returns enough data for the UI
 * to render the preview table with per-row status.
 */
export async function previewImportAction(
  formData: FormData,
): Promise<ActionResult<PreviewResponse>> {
  await requireRole(["admin", "hr"]);

  const args = {
    job_id: String(formData.get("job_id") ?? ""),
    source: String(formData.get("source") ?? "topcv") as CsvSource,
  };
  const parsedArgs = PreviewArgsSchema.safeParse(args);
  if (!parsedArgs.success) {
    return {
      ok: false,
      error: parsedArgs.error.issues[0]?.message ?? "Tham số không hợp lệ",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Vui lòng chọn file CSV." };
  if (file.size <= 0) return { ok: false, error: "File trống." };
  if (file.size > CSV_MAX_BYTES) return { ok: false, error: "File quá lớn. Tối đa 5 MB." };

  try {
    const buffer = await file.arrayBuffer();
    const parseResult = parseCsv(buffer, parsedArgs.data.source);
    const duplicates = await previewImport(parsedArgs.data.job_id, parseResult.rows);
    return { ok: true, data: { parse: parseResult, duplicates } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không phân tích được CSV" };
  }
}

const CommitArgsSchema = z.object({
  options: CommitImportOptionsSchema,
  rows: z.array(ImportedRowSchema).min(1, "Không có hàng nào để nhập"),
});

export async function commitImportAction(args: unknown): Promise<ActionResult<CommitResult>> {
  const profile = await requireRole(["admin", "hr"]);
  const parsed = CommitArgsSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  try {
    const result = await commitImport(parsed.data.rows, parsed.data.options, profile.id);
    revalidatePath(`/vi-tri/${parsed.data.options.job_id}`);
    revalidatePath("/ung-vien");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi nhập CSV" };
  }
}
