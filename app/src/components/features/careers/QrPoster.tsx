"use client";

import * as React from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, Printer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  jobId: string;
  jobTitle: string;
  location: string | null;
  applyUrl: string;
  jobOpen: boolean;
}

/** A5-ish recruitment poster with a scannable QR to the public apply page. */
export function QrPoster({ jobId, jobTitle, location, applyUrl, jobOpen }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, applyUrl, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#13245C", light: "#FFFFFF" },
    });
  }, [applyUrl]);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/vi-tri/${jobId}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Quay lại vị trí
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          In áp phích
        </Button>
      </div>

      {!jobOpen && (
        <p className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Tin này chưa ở trạng thái &quot;Đang tuyển&quot; — mã QR sẽ báo hết hạn cho ứng viên.
        </p>
      )}

      {/* The poster itself — the only thing that prints */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="bg-brand-900 px-8 py-6 text-center">
          <p className="text-2xl font-extrabold tracking-[0.3em] text-white">MẮT VIỆT</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-accent-400">
            Tuyển dụng
          </p>
        </div>
        <div className="h-1.5 bg-accent-400" aria-hidden />
        <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
          <h1 className="text-2xl font-bold leading-snug text-brand-900">{jobTitle}</h1>
          {location && <p className="text-sm text-slate-500">{location}</p>}
          <canvas ref={canvasRef} className="rounded-lg" aria-label="Mã QR ứng tuyển" />
          <div>
            <p className="text-base font-semibold text-brand-900">Quét mã để ứng tuyển ngay</p>
            <p className="mt-1 text-xs text-slate-500">
              hoặc truy cập <span className="font-medium text-primary-700">{applyUrl}</span>
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Ứng tuyển trực tuyến trong 2 phút — phản hồi trong 5 ngày làm việc
          </p>
        </div>
      </div>
    </div>
  );
}
