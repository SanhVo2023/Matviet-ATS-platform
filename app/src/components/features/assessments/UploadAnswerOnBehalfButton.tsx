"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { uploadAnswerOnBehalfAction } from "@/app/(dashboard)/ung-vien/[id]/actions";

export function UploadAnswerOnBehalfButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("file", file);
    const res = await uploadAnswerOnBehalfAction(fd);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      e.target.value = "";
      return;
    }
    toast.success("Đã lưu bài làm.");
    router.refresh();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={submitting}
        className="mt-2 gap-1"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden />
        {submitting ? "Đang tải…" : t.assessment.uploadAnswer}
      </Button>
    </>
  );
}
