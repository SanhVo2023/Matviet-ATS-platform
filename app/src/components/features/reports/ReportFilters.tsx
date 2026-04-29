"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          <Input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rep-to" className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3 text-slate-400" aria-hidden /> Đến ngày
          </Label>
          <Input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="rep-job" className="text-xs">
            Vị trí
          </Label>
          <select
            id="rep-job"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className={cn(
              "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary-500/40",
            )}
          >
            <option value="">Tất cả</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="rep-role" className="text-xs">
            Nhóm vị trí
          </Label>
          <select
            id="rep-role"
            value={roleFamily}
            onChange={(e) => setRoleFamily(e.target.value)}
            className={cn(
              "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary-500/40",
            )}
          >
            <option value="">Tất cả</option>
            {ROLE_FAMILIES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="rep-source" className="text-xs">
            Nguồn CV
          </Label>
          <select
            id="rep-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={cn(
              "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary-500/40",
            )}
          >
            <option value="">Tất cả</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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
