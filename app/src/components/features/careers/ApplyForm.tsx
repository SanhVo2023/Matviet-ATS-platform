"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  jobId: string;
  jobTitle: string;
}

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Public application form (G12). Anti-spam without a captcha service:
 * a honeypot field ("website") plus a minimum-fill-time stamp — the API
 * rejects submissions that fill the honeypot or arrive under 3 seconds.
 */
export function ApplyForm({ jobId, jobTitle }: Props) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [consent, setConsent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const openedAt = React.useRef(Date.now());
  const honeypotRef = React.useRef<HTMLInputElement>(null);

  const canSubmit =
    !submitting &&
    fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length >= 8 &&
    !!file &&
    consent;

  const onFileChange = (f: File | null) => {
    setError(null);
    if (f && f.type !== "application/pdf") {
      setError("Chỉ chấp nhận file PDF");
      setFile(null);
      return;
    }
    if (f && f.size > MAX_BYTES) {
      setError("File quá lớn — tối đa 10 MB");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("job_id", jobId);
      fd.set("full_name", fullName.trim());
      fd.set("email", email.trim());
      fd.set("phone", phone.trim());
      fd.set("consent", "yes");
      fd.set("website", honeypotRef.current?.value ?? "");
      fd.set("opened_at", String(openedAt.current));
      fd.set("file", file);
      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Có lỗi xảy ra, vui lòng thử lại");
        return;
      }
      setDone(true);
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
        <h3 className="text-lg font-semibold text-brand-900">Đã nhận hồ sơ của bạn!</h3>
        <p className="text-sm text-slate-600">
          Cảm ơn bạn đã ứng tuyển vị trí <strong>{jobTitle}</strong>. Email xác nhận đang được gửi
          tới <strong>{email.trim()}</strong> — chúng tôi sẽ phản hồi trong vòng 5 ngày làm việc.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="apply-name">
            Họ và tên <span className="text-error">*</span>
          </Label>
          <Input
            id="apply-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            maxLength={120}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apply-phone">
            Số điện thoại <span className="text-error">*</span>
          </Label>
          <Input
            id="apply-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="0901 234 567"
            maxLength={20}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-email">
          Email <span className="text-error">*</span>
        </Label>
        <Input
          id="apply-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          maxLength={200}
          required
        />
      </div>

      {/* Honeypot — invisible to humans, irresistible to bots */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="space-y-1.5">
        <Label htmlFor="apply-cv">
          CV của bạn (PDF) <span className="text-error">*</span>
        </Label>
        <label
          htmlFor="apply-cv"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 transition-colors hover:border-primary-400 hover:bg-primary-50/40"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {file ? (
            <span className="font-medium text-brand-900">{file.name}</span>
          ) : (
            "Bấm để chọn file PDF (tối đa 10 MB)"
          )}
        </label>
        <input
          id="apply-cv"
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        />
        <span>
          Tôi đồng ý cho Mắt Việt thu thập và xử lý thông tin cá nhân trong hồ sơ này cho mục đích
          tuyển dụng, theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.{" "}
          <span className="text-error">*</span>
        </span>
      </label>

      {error && <p className="text-sm text-error">{error}</p>}

      <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
        Gửi hồ sơ ứng tuyển
      </Button>
    </form>
  );
}
