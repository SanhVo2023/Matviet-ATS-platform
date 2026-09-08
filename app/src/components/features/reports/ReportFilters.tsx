"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Filter, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { DateInput } from "@/components/primitives/DateInput";

interface JobOption {
  id: string;
  title: string;
}

const ROLE_FAMILIES = [
  { value: "sales", label: "Bán hàng" },
  { value: "optician", label: "Khúc xạ / Tư vấn quang học" },
  { value: "office", label: "Văn phòng" },
  { value: "manager", label: "Quản lý" },
  { value: "custom", label: "Khác" },
] as const;

const SOURCES = [
  { value: "manual_upload", label: "Tải thủ công" },
  { value: "email_inbox", label: "Email" },
  { value: "csv_import", label: "Nhập CSV" },
  { value: "topcv_api", label: "TopCV API" },
  { value: "referral", label: "Giới thiệu" },
] as const;

interface Props {
  jobs: JobOption[];
  /** ISO date strings as initial values from URL — controlled inputs sync. */
  initialFrom: string;
  initialTo: string;
  initialJobId: string | null;
  initialRoleFamily: string | null;
  initialSource: string | null;
}

/**
 * URL-synced filter chrome for /bao-cao. Drops the entire query string when
 * the user clicks "Xóa lọc" so the chart cards re-render against the default
 * (last-30-days, all jobs) range.
 */
export function ReportFilters({
  jobs,
  initialFrom,
  initialTo,
  initialJobId,
  initialRoleFamily,
  initialSource,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = React.useState(toDateInput(initialFrom));
  const [to, setTo] = React.useState(toDateInput(initialTo));
  const [jobId, setJobId] = React.useState(initialJobId ?? "");
  const [roleFamily, setRoleFamily] = React.useState(initialRoleFamily ?? "");
  const [source, setSource] = React.useState(initialSource ?? "");

  const apply = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (from) params.set("from", new Date(from).toISOString());
    else params.delete("from");
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    else params.delete("to");
    if (jobId) params.set("job", jobId);
    else params.delete("job");
    if (roleFamily) params.set("role", roleFamily);
    else params.delete("role");
    if (source) params.set("source", source);
    else params.delete("source");
    const qs = params.toString();
    router.push(qs ? `/bao-cao?${qs}` : "/bao-cao");
  };

  const reset = () => {
    setJobId("");
    setRoleFamily("");
    setSource("");
    // Keep date range — that's the most common "narrow & re-explore" pattern.
    router.push("/bao-cao");
  };

  const hasFilter = !!(jobId || roleFamily || source);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="rep-from" className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3 text-slate-400" aria-hidden /> Từ ngày
          </Label>
          <DateInput id="rep-from" value={from} onChange={setFrom} silent />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rep-to" className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3 text-slate-400" aria-hidden /> Đến ngày
          </Label>
          <DateInput id="rep-to" value={to} onChange={setTo} silent />
        </div>

        <div className="space-y-1">
          <Label htmlFor="rep-job" className="text-xs">
            Vị trí
          </Label>
          <Combobox
            id="rep-job"
            value={jobId}
            onValueChange={setJobId}
            options={jobs.map((j) => ({ value: j.id, label: j.title }))}
            placeholder="Tất cả"
            searchPlaceholder="Tìm vị trí…"
            clearable
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="rep-role" className="text-xs">
            Nhóm vị trí
          </Label>
          <SimpleSelect
            id="rep-role"
            value={roleFamily}
            onValueChange={setRoleFamily}
            options={ROLE_FAMILIES.map((r) => ({ value: r.value, label: r.label }))}
            emptyLabel="Tất cả"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="rep-source" className="text-xs">
            Nguồn CV
          </Label>
          <SimpleSelect
            id="rep-source"
            value={source}
            onValueChange={setSource}
            options={SOURCES.map((s) => ({ value: s.value, label: s.label }))}
            emptyLabel="Tất cả"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-slate-500">
            <X className="h-3.5 w-3.5" aria-hidden /> Xóa lọc
          </Button>
        )}
        <Button onClick={apply} size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" aria-hidden /> Áp dụng
        </Button>
      </div>
    </div>
  );
}

/** Convert ISO timestamp to a yyyy-MM-dd value the <input type="date"> accepts. */
function toDateInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
