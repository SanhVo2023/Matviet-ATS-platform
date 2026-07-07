"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidateUploadDialog } from "./CandidateUploadDialog";

interface JobOption {
  id: string;
  title: string;
  status: string;
}

/**
 * "Thêm ứng viên" workspace-header CTA — opens the existing upload dialog
 * (CV-drop AI prefill included) scoped to the current job.
 */
export function AddCandidateButton({ jobId, jobs }: { jobId: string; jobs: JobOption[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" aria-hidden /> Tải CV lên
      </Button>
      <CandidateUploadDialog open={open} onOpenChange={setOpen} defaultJobId={jobId} jobs={jobs} />
    </>
  );
}
