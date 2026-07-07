"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CV_ACCEPTED_MIMES, CV_MAX_BYTES } from "@/lib/storage/paths";
import { bulkUploadCandidatesAction } from "@/app/(dashboard)/ung-vien/actions";

/**
 * The OBVIOUS start of the pipeline (ADR 0017): a drop target living at the
 * top of the 📥 intake column. Drop 1–20 PDFs → candidates appear right here,
 * names/emails/scores backfilled by AI within a minute.
 */
export function IntakeDropCard({ jobId }: { jobId: string }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const upload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
      .filter(
        (f) =>
          (CV_ACCEPTED_MIMES as readonly string[]).includes(f.type) &&
          f.size > 0 &&
          f.size <= CV_MAX_BYTES,
      )
      .slice(0, 20);
    if (files.length === 0) {
      toast.error("Chỉ nhận PDF, tối đa 10 MB mỗi file.");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("job_id", jobId);
    for (const f of files) fd.append("files", f);
    const res = await bulkUploadCandidatesAction(fd);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const { created, failed } = res.data!;
    toast.success(`Đã tạo ${created} ứng viên — AI đang đọc CV để điền tên và chấm điểm.`);
    for (const f of failed) toast.error(`${f.file}: ${f.error}`);
    router.refresh();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPTED_MIMES.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void upload(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-3 text-xs font-medium transition-colors",
          dragOver
            ? "border-accent-400 bg-accent-50 text-brand-900"
            : "border-slate-300 bg-white/70 text-slate-500 hover:border-accent-400 hover:text-brand-900",
          busy && "cursor-wait opacity-60",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Đang tải CV lên…
          </>
        ) : (
          <>
            <FileUp className="h-4 w-4" aria-hidden /> Thả CV (PDF) vào đây — bắt đầu quy trình
          </>
        )}
      </button>
    </>
  );
}
