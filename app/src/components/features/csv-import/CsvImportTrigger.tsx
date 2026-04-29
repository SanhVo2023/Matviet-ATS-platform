"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsvImportDialog } from "./CsvImportDialog";

export function CsvImportTrigger({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <FileUp className="h-4 w-4" aria-hidden /> Nhập CV từ CSV
      </Button>
      <CsvImportDialog open={open} onOpenChange={setOpen} jobId={jobId} jobTitle={jobTitle} />
    </>
  );
}
