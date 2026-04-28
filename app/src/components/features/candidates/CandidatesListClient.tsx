"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidatesTable } from "./CandidatesTable";
import { CandidateUploadDialog } from "./CandidateUploadDialog";
import { ALL_STAGES, type Stage } from "@/lib/validation/candidate";
import type { CandidateRow } from "@/server/candidates/repository";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface JobOption {
  id: string;
  title: string;
  status: string;
}

interface Props {
  initialCandidates: CandidateRow[];
  jobs: JobOption[];
}

const STAGE_FILTERS = ["all", ...ALL_STAGES] as const;
const SOURCE_FILTERS = [
  "all",
  "manual_upload",
  "email_inbox",
  "csv_import",
  "topcv_api",
  "referral",
] as const;

export function CandidatesListClient({ initialCandidates, jobs }: Props) {
  const router = useRouter();

  const [stage, setStage] = useQueryState(
    "stage",
    parseAsStringEnum<(typeof STAGE_FILTERS)[number]>([...STAGE_FILTERS]).withDefault("all"),
  );
  const [source, setSource] = useQueryState(
    "src",
    parseAsStringEnum<(typeof SOURCE_FILTERS)[number]>([...SOURCE_FILTERS]).withDefault("all"),
  );
  const [jobId, setJobId] = useQueryState("job", parseAsString.withDefault(""));
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

  const [uploadOpen, setUploadOpen] = React.useState(false);

  const jobsById = React.useMemo<Record<string, JobOption>>(() => {
    const m: Record<string, JobOption> = {};
    for (const j of jobs) m[j.id] = j;
    return m;
  }, [jobs]);

  const filtered = React.useMemo(() => {
    return initialCandidates.filter((c) => {
      if (stage !== "all" && c.current_stage !== stage) return false;
      if (source !== "all" && c.source !== source) return false;
      if (jobId && c.job_id !== jobId) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !c.full_name.toLowerCase().includes(q) &&
          !(c.email ?? "").toLowerCase().includes(q) &&
          !(c.phone ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [initialCandidates, stage, source, jobId, search]);

  // Group stages into top filter chips for screen real estate; full filter via dropdown.
  const TOP_STAGE_CHIPS: Array<(typeof STAGE_FILTERS)[number]> = [
    "all",
    "new",
    "screened",
    "interview_scheduled",
    "offer_sent",
    "hired",
    "rejected",
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.nav.candidates}</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} / {initialCandidates.length} ứng viên đang hiển thị
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} disabled={jobs.length === 0}>
          <Plus className="h-4 w-4" aria-hidden /> Tải lên ứng viên
        </Button>
      </header>

      <section
        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
        aria-label="Lọc danh sách"
      >
        <div className="flex flex-wrap items-center gap-1">
          {TOP_STAGE_CHIPS.map((s) => {
            const active = stage === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s === "all" ? "all" : (s as Stage))}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                )}
              >
                {s === "all" ? "Tất cả" : t.stage[s as Stage]}
              </button>
            );
          })}
        </div>

        <span className="mx-1 hidden h-5 w-px bg-slate-200 md:inline" />

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as (typeof STAGE_FILTERS)[number])}
          aria-label="Mọi giai đoạn"
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Mọi giai đoạn</option>
          {ALL_STAGES.map((s) => (
            <option key={s} value={s}>
              {t.stage[s]}
            </option>
          ))}
        </select>

        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value || null)}
          aria-label="Vị trí"
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Mọi vị trí</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => setSource(e.target.value as (typeof SOURCE_FILTERS)[number])}
          aria-label="Nguồn"
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Mọi nguồn</option>
          <option value="manual_upload">{t.source.manual_upload}</option>
          <option value="email_inbox">{t.source.email_inbox}</option>
          <option value="csv_import">{t.source.csv_import}</option>
          <option value="topcv_api">{t.source.topcv_api}</option>
          <option value="referral">{t.source.referral}</option>
        </select>

        <div className="relative ml-auto w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            placeholder="Tên / email / SĐT"
            className="h-9 pl-9"
            aria-label="Tìm ứng viên"
          />
        </div>
      </section>

      <CandidatesTable
        candidates={filtered}
        jobsById={jobsById}
        onCreate={() => setUploadOpen(true)}
      />

      <CandidateUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        jobs={jobs}
        onSuccess={(id) => router.push(`/ung-vien/${id}`)}
      />
    </div>
  );
}
