"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

export function ExportButtons() {
  const searchParams = useSearchParams();
  const qs = searchParams?.toString() ?? "";
  const [generating, setGenerating] = React.useState(false);

  /**
   * PDF is generated in the browser: fetch the payload JSON, then lazy-load
   * @react-pdf/renderer (~1.5 MB — only on click) and render to a Blob.
   * Server-side rendering is impossible on Workers (yoga WASM compilation).
   */
  const exportPdf = React.useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/reports/export/pdf-data${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const [{ pdf }, { ReportPdfDoc }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ReportPdfDoc"),
      ]);
      const blob = await pdf(<ReportPdfDoc payload={payload} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-tuyen-dung-${payload.filter.from.slice(0, 10)}-${payload.filter.to.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[reports] PDF export failed:", err);
      toast.error("Không xuất được PDF — thử lại sau.");
    } finally {
      setGenerating(false);
    }
  }, [qs]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={exportPdf}
        disabled={generating}
      >
        {generating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <FileText className="h-3.5 w-3.5" aria-hidden />
        )}{" "}
        {t.reports.export.pdf}
      </Button>
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a
          href={`/api/reports/export/excel${qs ? `?${qs}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden /> {t.reports.export.excel}
        </a>
      </Button>
    </div>
  );
}
