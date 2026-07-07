"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { Briefcase, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/primitives/PageHeader";
import { JobsTable } from "./JobsTable";
import { JobForm } from "./JobForm";
import { JOB_STATUSES, type JobInput } from "@/lib/validation/job";
import type { JobRow } from "@/server/jobs/repository";
import type { ManagerOption } from "./HiringManagerPicker";
import { createJobAction } from "@/app/(dashboard)/vi-tri/actions";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
}

interface Props {
  initialJobs: JobRow[];
  departments: Department[];
  managerOptions: ManagerOption[];
  /** When true (route is /vi-tri/moi), the create form auto-opens. */
  forceCreateOpen?: boolean;
}

const STATUS_FILTERS = ["all", ...JOB_STATUSES] as const;

export function JobsListClient({
  initialJobs,
  departments,
  managerOptions,
  forceCreateOpen,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringEnum<(typeof STATUS_FILTERS)[number]>([...STATUS_FILTERS]).withDefault("all"),
  );
  const [departmentId, setDepartmentId] = useQueryState("dept", parseAsString.withDefault(""));
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

  const [createOpen, setCreateOpen] = React.useState(!!forceCreateOpen);

  const filtered = React.useMemo(() => {
    return initialJobs.filter((j) => {
      if (status !== "all" && j.status !== status) return false;
      if (departmentId && j.department_id !== departmentId) return false;
      if (search.trim() && !j.title.toLowerCase().includes(search.trim().toLowerCase()))
        return false;
      return true;
    });
  }, [initialJobs, status, departmentId, search]);

  const onCreateSubmit = async (
    values: JobInput,
    intent: "save_draft" | "publish",
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const r = await createJobAction(values, intent);
    if (!r.ok) return r;
    router.refresh();
    return { ok: true, id: r.data?.id ?? "" };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Briefcase}
        title={t.nav.jobs}
        subtitle={`${filtered.length} / ${initialJobs.length} tin đang hiển thị`}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Tạo vị trí mới
          </Button>
        }
      />

      <section
        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
        aria-label="Lọc danh sách"
      >
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_FILTERS.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s === "all" ? "all" : s)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                )}
              >
                {s === "all" ? "Tất cả" : t.jobStatus[s]}
              </button>
            );
          })}
        </div>

        <span className="mx-1 hidden h-5 w-px bg-slate-200 md:inline" />

        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value || null)}
          aria-label="Phòng ban"
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
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
            placeholder="Tìm tiêu đề"
            className="h-9 pl-9"
            aria-label="Tìm tin"
          />
        </div>
      </section>

      <JobsTable jobs={filtered} onCreate={() => setCreateOpen(true)} />

      <JobForm
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o && forceCreateOpen) router.push("/vi-tri");
        }}
        mode="create"
        departments={departments}
        managerOptions={managerOptions}
        onSubmit={onCreateSubmit}
      />
    </div>
  );
}
