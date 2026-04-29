/**
 * Pure CSV parser — runs both server-side (in `service.ts`) and inside Vitest.
 *
 * Importing the rest of the csv-import service pulls in the Supabase admin
 * client, which fails at module load time when env vars aren't set
 * (typical during unit tests). Keeping the parser standalone keeps tests
 * fast and dependency-free.
 */

import Papa from "papaparse";
import {
  CSV_FIELDS,
  CSV_MAX_ROWS,
  ImportedRowSchema,
  stripDiacritics,
  type CsvField,
  type CsvSource,
  type ImportedRow,
} from "@/lib/validation/csv-import";

const HEADER_MAPS: Record<CsvSource, Record<string, CsvField>> = {
  topcv: {
    "ho va ten": "full_name",
    "ho ten": "full_name",
    name: "full_name",
    fullname: "full_name",
    email: "email",
    "dia chi email": "email",
    "so dien thoai": "phone",
    "dien thoai": "phone",
    phone: "phone",
    "phone number": "phone",
    "link cv": "cv_url",
    cv: "cv_url",
    "cv url": "cv_url",
    "url cv": "cv_url",
  },
  careerviet: {
    "ten ung vien": "full_name",
    "ho va ten": "full_name",
    "ho ten": "full_name",
    "candidate name": "full_name",
    "dia chi email": "email",
    email: "email",
    "dien thoai": "phone",
    "so dien thoai": "phone",
    phone: "phone",
    "url cv": "cv_url",
    "link cv": "cv_url",
    "cv link": "cv_url",
  },
};

/** Lowercase + strip diacritics + trim — for fuzzy header matching. */
export function normalizeHeader(h: string): string {
  return stripDiacritics(h.toLowerCase()).trim();
}

export interface ParseResult {
  rows: ImportedRow[];
  /** Map of CSV column index → CsvField (or null if unmapped). */
  columnMapping: Record<number, CsvField | null>;
  headers: string[];
  invalidRows: Array<{ index: number; error: string; raw: Record<string, string> }>;
  totalRowCount: number;
}

export function parseCsv(buffer: ArrayBuffer | string, source: CsvSource): ParseResult {
  const csvText = typeof buffer === "string" ? buffer : new TextDecoder("utf-8").decode(buffer);

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  const headerMap = HEADER_MAPS[source];

  const columnMapping: Record<number, CsvField | null> = {};
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    columnMapping[i] = headerMap[key] ?? null;
  });

  const rows: ImportedRow[] = [];
  const invalidRows: ParseResult["invalidRows"] = [];

  const rawRows = parsed.data.slice(0, CSV_MAX_ROWS);
  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx]!;
    const mapped: Partial<Record<CsvField, string | null>> = {};
    headers.forEach((h, i) => {
      const field = columnMapping[i];
      if (!field) return;
      const v = (raw[h] ?? "").trim();
      mapped[field] = v || null;
    });

    const candidate = {
      full_name: (mapped.full_name ?? "").trim(),
      email: mapped.email ?? null,
      phone: mapped.phone ?? null,
      cv_url: mapped.cv_url ?? null,
      source_meta: raw,
    };

    const parseRes = ImportedRowSchema.safeParse(candidate);
    if (parseRes.success) {
      rows.push(parseRes.data);
    } else {
      invalidRows.push({
        index: idx,
        error: parseRes.error.issues[0]?.message ?? "Hàng không hợp lệ",
        raw,
      });
    }
  }

  return {
    rows,
    columnMapping,
    headers,
    invalidRows,
    totalRowCount: rawRows.length,
  };
}

export const ALL_FIELDS = CSV_FIELDS;
