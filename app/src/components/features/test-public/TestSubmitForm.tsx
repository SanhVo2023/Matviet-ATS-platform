"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileDropZone } from "@/components/primitives/FileDropZone";
import { ASSESSMENT_ACCEPTED_MIMES, ASSESSMENT_FILE_MAX_BYTES } from "@/lib/validation/assessment";
import { t } from "@/lib/i18n";

export function TestSubmitForm({ token }: { token: string }) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Vui lòng chọn file bài làm.");
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("file", file);

    try {
      const res = await fetch("/api/test/submit", { method: "POST", body: fd });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Lỗi ${res.status}`);
        setSubmitting(false);
        return;
      }
      router.push("/test/cam-on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi mạng");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Tải lên bài làm</h2>

      <div className="space-y-2">
        <Label htmlFor="answer-file">{t.assessment.publicUploadLabel}</Label>
        <FileDropZone
          id="answer-file"
          accept={ASSESSMENT_ACCEPTED_MIMES}
          maxBytes={ASSESSMENT_FILE_MAX_BYTES}
          value={file}
          onChange={setFile}
          hint="Chỉ chấp nhận PDF, tối đa 20 MB."
        />
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <Button type="submit" disabled={submitting || !file} className="w-full gap-2">
        <Upload className="h-4 w-4" aria-hidden />
        {submitting ? "Đang nộp…" : t.assessment.publicSubmit}
      </Button>
    </form>
  );
}
