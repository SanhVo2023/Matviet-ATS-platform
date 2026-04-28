"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SlideOver } from "@/components/primitives/SlideOver";
import { FileDropZone } from "@/components/primitives/FileDropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CV_ACCEPTED_MIMES, CV_MAX_BYTES } from "@/lib/storage/paths";
import { uploadCandidateAction } from "@/app/(dashboard)/ung-vien/actions";
import { t } from "@/lib/i18n";

interface JobOption {
  id: string;
  title: string;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected job id (e.g. when uploading from a job's detail page). */
  defaultJobId?: string;
  jobs: JobOption[];
  /** Where to navigate after successful upload. Defaults to the new candidate's detail page. */
  onSuccess?: (candidateId: string) => void;
}

export function CandidateUploadDialog({
  open,
  onOpenChange,
  defaultJobId,
  jobs,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form on open
  React.useEffect(() => {
    if (open) {
      setFile(null);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Vui lòng chọn file CV.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("file", file);

    setSubmitting(true);
    const result = await uploadCandidateAction(fd);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Đã tải lên ứng viên.");
    const id = result.data?.id;
    onOpenChange(false);
    if (id) {
      if (onSuccess) onSuccess(id);
      else router.push(`/ung-vien/${id}`);
    }
    router.refresh();
  };

  const openJobs = jobs.filter((j) => j.status === "open" || j.status === "draft");

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      width="lg"
      title="Tải lên ứng viên mới"
      description="Đính kèm CV (PDF/DOCX). Hệ thống sẽ chấm điểm AI tự động sau khi tải lên."
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <SlideOver.Body>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cv-file">CV của ứng viên</Label>
              <FileDropZone
                id="cv-file"
                accept={CV_ACCEPTED_MIMES}
                maxBytes={CV_MAX_BYTES}
                value={file}
                onChange={setFile}
                disabled={submitting}
                hint="PDF hoặc DOCX, tối đa 10 MB."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t.candidate.fullName}</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  minLength={2}
                  disabled={submitting}
                  placeholder="Vd: Nguyễn Văn A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_id">{t.candidate.appliedTo}</Label>
                <select
                  id="job_id"
                  name="job_id"
                  required
                  defaultValue={defaultJobId ?? ""}
                  disabled={submitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">— Chọn vị trí —</option>
                  {openJobs.length === 0 ? (
                    <option disabled>Không có tin nào đang mở</option>
                  ) : (
                    openJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.candidate.email}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  disabled={submitting}
                  placeholder="vd@gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t.candidate.phone}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  disabled={submitting}
                  placeholder="0901 234 567"
                />
              </div>
            </div>

            <input type="hidden" name="source" value="manual_upload" />

            <div className="space-y-2">
              <Label htmlFor="notes">{t.candidate.notes}</Label>
              <Textarea
                id="notes"
                name="notes"
                disabled={submitting}
                placeholder="Ghi chú thêm về ứng viên (không bắt buộc)..."
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-md bg-error-bg/40 px-3 py-2 text-sm text-error-fg">
                {error}
              </p>
            ) : null}
          </div>
        </SlideOver.Body>
        <SlideOver.Footer>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t.action.cancel}
          </Button>
          <Button type="submit" disabled={submitting || !file}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? "Đang tải lên..." : "Tải lên"}
          </Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}
