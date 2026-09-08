"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { toast } from "sonner";
import { Plus, Search, Users, RefreshCw, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SimpleSelect, type SelectOption } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { PageHeader } from "@/components/primitives/PageHeader";
import { CandidatesTable } from "./CandidatesTable";
import { CandidateUploadDialog } from "./CandidateUploadDialog";
import { ALL_STAGES, type Stage } from "@/lib/validation/candidate";
import type { CandidateRow } from "@/server/candidates/repository";
import { retryFailedScoringAction } from "@/app/(dashboard)/ung-vien/actions";
import { t } from "@/lib/i18n";

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
  "careers_page",
] as const;
const AI_FILTERS = ["all", "pending", "success", "failed"] as const;
const AI_FILTER_LABEL: Record<(typeof AI_FILTERS)[number], string> = {
  all: "Tất cả",
  pending: "Đang chấm",
  success: "Đã chấm",
  failed: "Chấm lỗi",
};

const SOURCE_OPTIONS: SelectOption[] = [
  { value: "all", label: "Mọi nguồn" },
  { value: "manual_upload", label: t.source.manual_upload },
  { value: "email_inbox", label: t.source.email_inbox },
  { value: "csv_import", label: t.source.csv_import },
  { value: "topcv_api", label: t.source.topcv_api },
  { value: "referral", label: t.source.referral },
  { value: "careers_page", label: t.source.careers_page },
];

const AI_OPTIONS: SelectOption[] = AI_FILTERS.map((f) => ({
  value: f,
  label: f === "all" ? "Mọi trạng thái AI" : AI_FILTER_LABEL[f],
}));

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
  const [ai, setAi] = useQueryState(
    "ai",
    parseAsStringEnum<(typeof AI_FILTERS)[number]>([...AI_FILTERS]).withDefault("all"),
  );

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);

  const jobsById = React.useMemo<Record<string, JobOption>>(() => {
    const m: Record<string, JobOption> = {};
    for (const j of jobs) m[j.id] = j;
    return m;
  }, [jobs]);

  const filtered = React.useMemo(() => {
    return initialCandidates.filter((c) => {
      if (stage !== "all" && c.current_stage !== stage) return false;
      if (source !== "all" && c.source !== source) return false;
      if (ai !== "all" && c.ai_screening_status !== ai) return false;
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
  }, [initialCandidates, stage, source, ai, jobId, search]);

  const failedCount = React.useMemo(
    () => filtered.filter((c) => c.ai_screening_status === "failed").length,
    [filtered],
  );

  const runBulkRetry = () => {
    setRetrying(true);
    void retryFailedScoringAction(jobId || undefined).then((r) => {
      setRetrying(false);
      if (r.ok) {
        toast.success(`Đã xếp lại ${r.count} hồ sơ để chấm lại.`);
        router.refresh();
      } else toast.error(r.error);
    });
  };

  // Group stages into top filter chips for screen real estate; full filter via dropdown.
  const TOP_STAGE_CHIPS: Array<(typeof STAGE_FILTERS)[number]> = [
    "all",
    "intake",
    "evaluating",
    "approving",
    "offer",
    "hired",
    "rejected",
  ];

  // Chips show the working stages; the dropdown holds only the long tail so
  // the two controls never fight over the same value (UX audit).
  const tailStageOptions: SelectOption[] = ALL_STAGES.filter(
    (st) => !(TOP_STAGE_CHIPS as readonly string[]).includes(st),
  ).map((st) => ({ value: st, label: t.stage[st] }));
  const tailStageValue = tailStageOptions.some((o) => o.value === stage) ? stage : "";
  const hasFilters =
    stage !== "all" || source !== "all" || jobId !== "" || search !== "" || ai !== "all";
  const clearFilters = () => {
    void setStage(null);
    void setSource(null);
    void setJobId(null);
    void setSearch(null);
    void setAi(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title={t.nav.candidates}
        subtitle={`${filtered.length} / ${initialCandidates.length} ứng viên đang hiển thị`}
        action={
          <Button onClick={() => setUploadOpen(true)} disabled={jobs.length === 0}>
            <Plus className="h-4 w-4" aria-hidden /> Tải lên ứng viên
          </Button>
        }
      />

      <section
        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
        aria-label="Lọc danh sách"
      >
        {/* Scroll the chip strip within itself on narrow screens instead of
            overflowing the page body (renovation R4 — mobile). */}
        <div className="-mx-1 max-w-full overflow-x-auto px-1">
          <Segmented
            id="candidates-stage"
            size="sm"
            aria-label="Lọc theo giai đoạn"
            options={TOP_STAGE_CHIPS.map((s) => ({
              value: s,
              label: s === "all" ? "Tất cả" : t.stage[s as Stage],
            }))}
            value={stage}
            onChange={(s) => setStage(s)}
          />
        </div>

        <span className="mx-1 hidden h-5 w-px bg-slate-200 md:inline" />

        <SimpleSelect
          value={tailStageValue}
          onValueChange={(v) => setStage(v as (typeof STAGE_FILTERS)[number])}
          aria-label="Giai đoạn khác"
          placeholder="Giai đoạn khác…"
          className="w-auto min-w-[10rem]"
          options={tailStageOptions}
        />

        <Combobox
          value={jobId}
          onValueChange={(v) => setJobId(v || null)}
          aria-label="Vị trí"
          className="w-auto min-w-[10rem]"
          placeholder="Mọi vị trí"
          searchPlaceholder="Tìm vị trí…"
          clearable
          options={jobs.map((j) => ({ value: j.id, label: j.title }))}
        />

        <SimpleSelect
          value={source}
          onValueChange={(v) => setSource(v as (typeof SOURCE_FILTERS)[number])}
          aria-label="Nguồn"
          className="w-auto min-w-[9rem]"
          options={SOURCE_OPTIONS}
        />

        <SimpleSelect
          value={ai}
          onValueChange={(v) => setAi(v as (typeof AI_FILTERS)[number])}
          aria-label="Trạng thái chấm AI"
          className="w-auto min-w-[10rem]"
          options={AI_OPTIONS}
        />

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4" aria-hidden />
            Xóa bộ lọc
          </Button>
        ) : null}

        {failedCount > 0 ? (
          <Button variant="outline" onClick={runBulkRetry} disabled={retrying}>
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
            Chấm lại {failedCount} hồ sơ lỗi
          </Button>
        ) : null}

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
