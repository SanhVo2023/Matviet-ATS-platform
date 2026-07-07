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
import {
  uploadCandidateAction,
  prefillFromCvAction,
  bulkUploadCandidatesAction,
} from "@/app/(dashboard)/ung-vien/actions";
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
  // Bulk mode (ADR 0017): several PDFs dropped at once → create-all now,
  // AI backfills names/emails from each CV as scoring runs.
  const [bulkFiles, setBulkFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // CV-drop prefill (ADR 0015): AI reads the dropped CV and fills the
  // contact fields; HR confirms instead of typing.
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [prefilling, setPrefilling] = React.useState(false);
  const [prefilled, setPrefilled] = React.useState(false);
  // The prefill extraction's markdown — passed back on submit to seed the
  // CV→MD cache so the file is never converted twice (ADR 0017).
  const cvMdRef = React.useRef<string>("");
  const prefillSeq = React.useRef(0);

  const bulkMode = bulkFiles.length > 0;

  // Reset form on open
  React.useEffect(() => {
    if (open) {
      setFile(null);
      setBulkFiles([]);
      setError(null);
      setFullName("");
      setEmail("");
      setPhone("");
      setPrefilled(false);
      setPrefilling(false);
      cvMdRef.current = "";
    }
  }, [open]);

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setPrefilled(false);
    cvMdRef.current = "";
    if (!f) return;
    const seq = ++prefillSeq.current;
    setPrefilling(true);
    const fd = new FormData();
    fd.set("file", f);
    void prefillFromCvAction(fd)
      .then((res) => {
        if (seq !== prefillSeq.current) return; // a newer file replaced this one
        if (res.ok && res.data) {
          if (res.data.full_name) setFullName((v) => v || res.data!.full_name!);
          if (res.data.email) setEmail((v) => v || res.data!.email!);
          if (res.data.phone) setPhone((v) => v || res.data!.phone!);
          if (res.data.cv_md) cvMdRef.current = res.data.cv_md;
          if (res.data.full_name || res.data.email || res.data.phone) setPrefilled(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (seq === prefillSeq.current) setPrefilling(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // ---- Bulk mode: create every PDF as a candidate right away ----
    if (bulkMode) {
      const fd = new FormData(e.currentTarget);
      const jobId = String(fd.get("job_id") ?? "");
      if (!jobId) {
        setError("Vui lòng chọn vị trí.");
        return;
      }
      const bfd = new FormData();
      bfd.set("job_id", jobId);
      for (const f of bulkFiles) bfd.append("files", f);

      setSubmitting(true);
      const result = await bulkUploadCandidatesAction(bfd);
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { created, failed } = result.data!;
      toast.success(`Đã tạo ${created} ứng viên — AI đang đọc CV để điền tên và chấm điểm.`);
      for (const f of failed) toast.error(`${f.file}: ${f.error}`);
      onOpenChange(false);
      router.refresh();
      return;
    }

    // ---- Single mode: confirm-then-create (prefill already ran) ----
    if (!file) {
      setError("Vui lòng chọn file CV.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("file", file);
    if (cvMdRef.current) fd.set("cv_md", cvMdRef.current);

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
              <Label htmlFor="cv-file">CV của ứng viên (thả nhiều file để tạo hàng loạt)</Label>
              {bulkMode ? (
                <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-brand-900">
                    {bulkFiles.length} CV sẽ được tạo — AI tự đọc và điền tên/email/SĐT sau.
                  </p>
                  <ul className="max-h-44 space-y-1 overflow-y-auto">
                    {bulkFiles.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-xs"
                      >
                        <span className="min-w-0 truncate text-slate-700">{f.name}</span>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setBulkFiles((cur) => cur.filter((_, j) => j !== i))}
                          className="shrink-0 text-slate-400 hover:text-error-fg"
                          aria-label={`Bỏ ${f.name}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setBulkFiles([])}
                    className="text-xs text-slate-500 underline-offset-2 hover:underline"
                  >
                    Bỏ tất cả, chọn lại
                  </button>
                </div>
              ) : (
                <FileDropZone
                  id="cv-file"
                  accept={CV_ACCEPTED_MIMES}
                  maxBytes={CV_MAX_BYTES}
                  value={file}
                  onChange={handleFileChange}
                  multiple
                  onMultiple={(files) => {
                    setFile(null);
                    setBulkFiles(files.slice(0, 20));
                  }}
                  disabled={submitting}
                  hint="PDF, tối đa 10 MB. Thả nhiều file cùng lúc để tạo hàng loạt (tối đa 20)."
                />
              )}
              {!bulkMode && prefilling && (
                <p className="flex items-center gap-1.5 text-xs text-primary-700">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />✨ AI đang đọc CV để điền
                  thông tin…
                </p>
              )}
              {!bulkMode && prefilled && !prefilling && (
                <p className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                  ✓ Đã tự điền từ CV — kiểm tra lại rồi bấm Tải lên.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {!bulkMode && (
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t.candidate.fullName}</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    minLength={2}
                    disabled={submitting}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Vd: Nguyễn Văn A"
                  />
                </div>
              )}
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
                    <option disabled>Không có vị trí nào đang mở</option>
                  ) : (
                    openJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {!bulkMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.candidate.email}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      disabled={submitting}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0901 234 567"
                    />
                  </div>
                </>
              )}
            </div>

            <input type="hidden" name="source" value="manual_upload" />

            {!bulkMode && (
              <div className="space-y-2">
                <Label htmlFor="notes">{t.candidate.notes}</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  disabled={submitting}
                  placeholder="Ghi chú thêm về ứng viên (không bắt buộc)..."
                />
              </div>
            )}

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
          <Button type="submit" disabled={submitting || (!file && bulkFiles.length === 0)}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting
              ? "Đang tải lên..."
              : bulkMode
                ? `Tải lên ${bulkFiles.length} CV`
                : "Tải lên"}
          </Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}
