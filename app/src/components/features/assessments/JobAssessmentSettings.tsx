"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileDropZone } from "@/components/primitives/FileDropZone";
import { ASSESSMENT_ACCEPTED_MIMES, ASSESSMENT_FILE_MAX_BYTES } from "@/lib/validation/assessment";
import { createAssessmentAction } from "@/app/(dashboard)/cai-dat/bai-test/actions";
import { t } from "@/lib/i18n";

interface Props {
  jobId: string;
  jobTitle: string;
  /** Existing active assessment if any (so HR sees what they're replacing). */
  existing: {
    id: string;
    original_name: string | null;
    instructions: string | null;
    time_limit_min: number | null;
  } | null;
}

export function JobAssessmentSettings({ jobId, jobTitle, existing }: Props) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [instructions, setInstructions] = React.useState(existing?.instructions ?? "");
  const [timeLimit, setTimeLimit] = React.useState<string>(
    existing?.time_limit_min ? String(existing.time_limit_min) : "",
  );
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast.error("Vui lòng chọn file đề bài.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.set("job_id", jobId);
    fd.set("instructions", instructions);
    if (timeLimit) fd.set("time_limit_min", timeLimit);
    fd.set("file", file);

    const res = await createAssessmentAction(fd);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(existing ? "Đã cập nhật bài test." : "Đã tạo bài test.");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          {t.assessment.configureForJob}: {jobTitle}
        </h2>
        <p className="text-sm text-slate-500">
          Một vị trí chỉ có một bài test đang hoạt động. Tải file mới sẽ thay thế file cũ.
        </p>
      </div>

      {existing && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden />
            <div className="text-xs text-slate-600">
              <p>
                <span className="font-medium text-slate-700">Bài test hiện tại:</span>{" "}
                {existing.original_name ?? "—"}
              </p>
              {existing.time_limit_min && <p>Thời gian: {existing.time_limit_min} phút</p>}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="test-file">{t.assessment.fileLabel}</Label>
        <FileDropZone
          id="test-file"
          accept={ASSESSMENT_ACCEPTED_MIMES}
          maxBytes={ASSESSMENT_FILE_MAX_BYTES}
          value={file}
          onChange={setFile}
          hint="Kéo thả file PDF vào đây hoặc bấm để chọn."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="test-time">{t.assessment.timeLimitLabel}</Label>
        <Input
          id="test-time"
          type="number"
          min={1}
          max={480}
          step={5}
          value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value)}
          placeholder={t.assessment.timeLimitPlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="test-inst">{t.assessment.instructionsLabel}</Label>
        <Textarea
          id="test-inst"
          rows={4}
          maxLength={2000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={t.assessment.instructionsPlaceholder}
          lang="vi"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu…" : existing ? "Cập nhật bài test" : "Tạo bài test"}
        </Button>
      </div>
    </form>
  );
}
