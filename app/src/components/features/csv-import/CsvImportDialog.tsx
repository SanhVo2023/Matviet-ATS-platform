"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, FileUp, Upload } from "lucide-react";
import { SlideOver } from "@/components/primitives/SlideOver";
import { FileDropZone } from "@/components/primitives/FileDropZone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { CSV_MAX_BYTES } from "@/lib/validation/csv-import";
import {
  commitImportAction,
  previewImportAction,
  type PreviewResponse,
} from "@/app/(dashboard)/vi-tri/[id]/import/actions";
import { CsvPreviewTable } from "./CsvPreviewTable";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
  jobTitle: string;
}

type Step = "upload" | "preview" | "result";

const SOURCES = [
  { value: "topcv", label: "TopCV" },
  { value: "careerviet", label: "CareerViet" },
] as const;

export function CsvImportDialog({ open, onOpenChange, jobId, jobTitle }: Props) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [source, setSource] = React.useState<"topcv" | "careerviet">("topcv");
  const [fetchCvs, setFetchCvs] = React.useState(true);
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);
  const [preview, setPreview] = React.useState<PreviewResponse | null>(null);
  const [result, setResult] = React.useState<{
    inserted: number;
    skipped: number;
    failed: number;
    errors: Array<{ full_name: string; error: string }>;
  } | null>(null);
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep("upload");
      setFile(null);
      setPreview(null);
      setResult(null);
      setSource("topcv");
      setFetchCvs(true);
      setSkipDuplicates(true);
    }
  }, [open]);

  const handlePreview = async () => {
    if (!file) {
      toast.error("Vui lòng chọn file CSV.");
      return;
    }
    setWorking(true);
    const fd = new FormData();
    fd.set("job_id", jobId);
    fd.set("source", source);
    fd.set("file", file);
    const res = await previewImportAction(fd);
    setWorking(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.data) {
      setPreview(res.data);
      setStep("preview");
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setWorking(true);
    const res = await commitImportAction({
      options: {
        job_id: jobId,
        source,
        fetch_cvs: fetchCvs,
        skip_duplicates: skipDuplicates,
      },
      rows: preview.parse.rows,
    });
    setWorking(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.data) {
      setResult({
        inserted: res.data.inserted,
        skipped: res.data.skipped_duplicates,
        failed: res.data.failed,
        errors: res.data.errors.map((e) => ({ full_name: e.full_name, error: e.error })),
      });
      setStep("result");
      router.refresh();
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      width="xl"
      title={t.importCsv.title}
      description={`Vị trí: ${jobTitle}`}
    >
      <SlideOver.Body>
        <Stepper step={step} />

        {step === "upload" && (
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label>{t.importCsv.sourceLabel}</Label>
              <div className="flex gap-2">
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSource(s.value)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm transition-colors",
                      source === s.value
                        ? "border-primary-500 bg-primary-50 text-primary-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file">{t.importCsv.fileLabel}</Label>
              <FileDropZone
                id="csv-file"
                accept={["text/csv", "application/vnd.ms-excel"]}
                maxBytes={CSV_MAX_BYTES}
                value={file}
                onChange={setFile}
                hint={t.importCsv.fileHint}
              />
            </div>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-700">
                <span className="font-semibold">
                  {t.importCsv.rowCount.replace("{{count}}", String(preview.parse.rows.length))}
                </span>
                {preview.parse.invalidRows.length > 0 && (
                  <span className="ml-2 text-rose-600">
                    + {preview.parse.invalidRows.length} {t.importCsv.invalidRow.toLowerCase()}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={fetchCvs}
                    onChange={(e) => setFetchCvs(e.target.checked)}
                    className="h-4 w-4"
                  />
                  {t.importCsv.fetchCvsToggle}
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="h-4 w-4"
                  />
                  {t.importCsv.skipDuplicatesToggle}
                </label>
              </div>
            </div>

            <CsvPreviewTable preview={preview} />
          </div>
        )}

        {step === "result" && result && (
          <div className="mt-6 space-y-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {t.importCsv.summarySuccess.replace("{{count}}", String(result.inserted))}
                  </p>
                  {result.skipped > 0 && (
                    <p className="mt-1 text-xs text-emerald-800">
                      {t.importCsv.summarySkipped.replace("{{count}}", String(result.skipped))}
                    </p>
                  )}
                  {result.failed > 0 && (
                    <p className="mt-1 text-xs text-rose-700">
                      {t.importCsv.summaryFailed.replace("{{count}}", String(result.failed))}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">
                  Lỗi cụ thể
                </p>
                <ul className="mt-2 space-y-1 text-xs text-rose-700">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      <strong>{e.full_name}:</strong> {e.error}
                    </li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="italic">… và {result.errors.length - 10} hàng khác</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </SlideOver.Body>

      <SlideOver.Footer>
        {step === "upload" && (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
              {t.action.cancel}
            </Button>
            <Button onClick={handlePreview} disabled={working || !file} className="gap-2">
              <FileUp className="h-4 w-4" aria-hidden />
              {working ? t.importCsv.previewing : t.action.preview}
            </Button>
          </>
        )}
        {step === "preview" && preview && (
          <>
            <Button variant="outline" onClick={() => setStep("upload")} disabled={working}>
              {t.action.back}
            </Button>
            <Button
              onClick={handleCommit}
              disabled={working || preview.parse.rows.length === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" aria-hidden />
              {working ? t.importCsv.importing : t.importCsv.confirm}
            </Button>
          </>
        )}
        {step === "result" && (
          <Button onClick={() => onOpenChange(false)}>{t.action.confirm}</Button>
        )}
      </SlideOver.Footer>
    </SlideOver>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "upload", label: t.importCsv.step1 },
    { id: "preview", label: t.importCsv.step2 },
    { id: "result", label: t.importCsv.step3 },
  ];
  const currentIndex = steps.findIndex((s) => s.id === step);
  return (
    <ol className="flex gap-2 text-xs">
      {steps.map((s, i) => (
        <li
          key={s.id}
          className={cn(
            "flex-1 rounded-md border px-3 py-2",
            i < currentIndex && "border-emerald-200 bg-emerald-50 text-emerald-900",
            i === currentIndex && "border-primary-500 bg-primary-50 text-primary-900",
            i > currentIndex && "border-slate-200 bg-slate-50 text-slate-500",
          )}
        >
          <span className="font-mono">{i + 1}.</span> {s.label}
        </li>
      ))}
    </ol>
  );
}
