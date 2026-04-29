"use client";

import * as React from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  /** MIME types accepted (e.g. ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]). */
  accept: readonly string[];
  /** Max bytes per file. Files exceeding this are rejected client-side too (server re-validates). */
  maxBytes: number;
  value: File | null;
  onChange: (file: File | null) => void;
  /** User-facing copy. */
  hint?: string;
  disabled?: boolean;
  /** ID for the underlying input — also receives focus from a wrapping <Label htmlFor>. */
  id?: string;
}

/**
 * Drag-and-drop file zone with click-to-browse fallback.
 *
 * Visual states:
 *   - empty + idle    → dashed border, helper text + icon
 *   - dragging-over   → primary border + tint
 *   - file selected   → file name + size + remove button
 *   - error           → red border (driven by parent passing the rejected file back as null + showing the error itself)
 */
export function FileDropZone({
  accept,
  maxBytes,
  value,
  onChange,
  hint,
  disabled,
  id = "file-drop-zone",
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const validate = (f: File): string | null => {
    if (!accept.includes(f.type)) return "Loại file không hỗ trợ. Chỉ chấp nhận PDF.";
    if (f.size > maxBytes) return `File quá lớn. Tối đa ${Math.round(maxBytes / 1024 / 1024)} MB.`;
    if (f.size === 0) return "File trống.";
    return null;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0]!;
    const err = validate(f);
    if (err) {
      setError(err);
      onChange(null);
      return;
    }
    setError(null);
    onChange(f);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
        aria-describedby={`${id}-hint`}
      />

      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">{value.name}</p>
              <p className="text-xs text-slate-500">{(value.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Bỏ chọn"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={disabled}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragOver
              ? "border-primary-500 bg-primary-50"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Upload className="h-6 w-6 text-slate-400" aria-hidden />
          <div>
            <p className="text-sm font-medium text-slate-700">
              Kéo thả file vào đây hoặc <span className="text-primary-600">bấm để chọn</span>
            </p>
            {hint ? (
              <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
                {hint}
              </p>
            ) : null}
          </div>
        </button>
      )}

      {error ? (
        <p role="alert" className="text-sm text-error-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
