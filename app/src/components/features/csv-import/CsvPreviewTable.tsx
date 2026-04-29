"use client";

import * as React from "react";
import { AlertTriangle, Check, Link as LinkIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import type { PreviewResponse } from "@/app/(dashboard)/tin-tuyen-dung/[id]/import/actions";
import type { CsvField } from "@/lib/validation/csv-import";

const FIELD_LABEL: Record<CsvField, string> = {
  full_name: "Họ tên",
  email: "Email",
  phone: "SĐT",
  cv_url: "Link CV",
};

export function CsvPreviewTable({ preview }: { preview: PreviewResponse }) {
  const { parse, duplicates } = preview;
  const rowsWithStatus = parse.rows.map((row, i) => ({
    row,
    duplicate: duplicates[i]?.duplicate_match ?? null,
  }));

  return (
    <div className="space-y-3">
      <ColumnMappingSummary preview={preview} />

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Họ tên</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">SĐT</th>
              <th className="px-3 py-2 font-medium">CV</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rowsWithStatus.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Không có hàng hợp lệ
                </td>
              </tr>
            )}
            {rowsWithStatus.map(({ row, duplicate }, i) => (
              <tr key={i} className={duplicate ? "bg-amber-50" : undefined}>
                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{row.full_name}</td>
                <td className="px-3 py-2 text-slate-700">{row.email ?? "—"}</td>
                <td className="px-3 py-2 text-slate-700">{row.phone ?? "—"}</td>
                <td className="px-3 py-2 text-slate-500">
                  {row.cv_url ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <LinkIcon className="h-3 w-3" aria-hidden />
                      Có
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  {duplicate ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                      <AlertTriangle className="h-3 w-3" aria-hidden /> {t.importCsv.duplicateHit}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                      <Check className="h-3 w-3" aria-hidden /> OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {parse.invalidRows.length > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">
            {parse.invalidRows.length} {t.importCsv.invalidRow.toLowerCase()}
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-rose-700">
            {parse.invalidRows.slice(0, 10).map((r) => (
              <li key={r.index}>
                Hàng {r.index + 1}: {r.error}
              </li>
            ))}
            {parse.invalidRows.length > 10 && (
              <li className="italic">… và {parse.invalidRows.length - 10} hàng khác</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function ColumnMappingSummary({ preview }: { preview: PreviewResponse }) {
  const mapped: Array<{ header: string; field: CsvField }> = [];
  const unmapped: string[] = [];
  preview.parse.headers.forEach((header, i) => {
    const field = preview.parse.columnMapping[i];
    if (field) mapped.push({ header, field });
    else unmapped.push(header);
  });
  if (mapped.length === 0) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <p className="font-medium text-slate-700">Bảng cột đã ánh xạ</p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {mapped.map((m) => (
          <span key={m.header}>
            {m.header} → <strong className="text-slate-900">{FIELD_LABEL[m.field]}</strong>
          </span>
        ))}
      </div>
      {unmapped.length > 0 && (
        <p className="mt-1 italic text-slate-500">Bỏ qua: {unmapped.join(", ")}</p>
      )}
    </div>
  );
}
