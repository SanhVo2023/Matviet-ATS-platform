"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function ExportButtons() {
  const searchParams = useSearchParams();
  const qs = searchParams?.toString() ?? "";

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a
          href={`/api/reports/export/pdf${qs ? `?${qs}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden /> {t.reports.export.pdf}
        </a>
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
