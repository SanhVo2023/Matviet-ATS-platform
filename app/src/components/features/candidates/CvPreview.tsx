"use client";

import * as React from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Authed streaming URL (/api/files/...). */
  signedUrl: string | null;
  mime: string;
  originalName: string;
  /** Optional action slot (e.g. the "Đổi CV" re-upload button). */
  actionSlot?: React.ReactNode;
}

/**
 * CV preview. PDF renders via an iframe (browser handles rendering — no
 * client-side react-pdf bundle until G4 when we may need text extraction).
 * DOCX shows a download-only card.
 *
 * Future (G4+): swap the iframe for `react-pdf` to enable text-layer search,
 * page navigation, and selection highlighting for the AI evidence quotes.
 */
export function CvPreview({ signedUrl, mime, originalName, actionSlot }: Props) {
  if (!signedUrl) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        <Loader2 className="mx-auto h-4 w-4 animate-spin text-slate-400" aria-hidden />
        <p className="mt-2">Đang tạo link tải CV…</p>
      </div>
    );
  }

  if (mime === "application/pdf") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <FileText className="h-4 w-4" aria-hidden /> {originalName}
          </p>
          <span className="flex items-center gap-2">
            {actionSlot}
            <Button asChild variant="outline" size="sm">
              <a href={signedUrl} download={originalName} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" aria-hidden /> Tải về
              </a>
            </Button>
          </span>
        </div>
        <iframe
          src={signedUrl}
          className="h-[600px] w-full rounded-md border border-slate-200"
          title={`CV: ${originalName}`}
        />
      </div>
    );
  }

  // DOCX / DOC fallback — browsers can't render natively
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <FileText className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
      <p className="mt-3 text-sm text-slate-700">{originalName}</p>
      <p className="mt-1 text-xs text-slate-500">
        File dạng Word — chưa hỗ trợ xem trực tiếp. Tải về để mở (AI vẫn đọc và chấm điểm được).
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        {actionSlot}
        <Button asChild variant="navy" size="sm">
          <a href={signedUrl} download={originalName} target="_blank" rel="noreferrer">
            <Download className="h-4 w-4" aria-hidden /> Tải về
          </a>
        </Button>
      </div>
    </div>
  );
}
