"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pause, Play, X, Archive, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/primitives/DataTable";
import { EmptyState } from "@/components/primitives/EmptyState";
import { JobStatusBadge } from "@/components/primitives/StatusBadge";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import type { JobRow } from "@/server/jobs/repository";
import type { Database } from "@/types/db";
import { setJobStatusAction, archiveJobAction } from "@/app/(dashboard)/tin-tuyen-dung/actions";

type JobStatus = Database["public"]["Enums"]["job_status"];

interface Props {
  jobs: JobRow[];
  onCreate: () => void;
}

export function JobsTable({ jobs, onCreate }: Props) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<JobRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: () => <span>{t.jobForm.title}</span>,
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.title}</span>,
      },
      {
        accessorKey: "role_family",
        header: () => <span>{t.jobForm.roleFamily}</span>,
        cell: ({ row }) => (
          <span className="text-slate-600">{t.roleFamily[row.original.role_family]}</span>
        ),
      },
      {
        accessorKey: "headcount",
        header: () => <span>{t.jobForm.headcount}</span>,
        cell: ({ row }) => row.original.headcount,
      },
      {
        accessorKey: "status",
        header: () => <span>Trạng thái</span>,
        cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "posted_at",
        header: () => <span>Đăng ngày</span>,
        cell: ({ row }) => (row.original.posted_at ? formatDate(row.original.posted_at) : "—"),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Hành động</span>,
        cell: ({ row }) => <RowActions job={row.original} />,
        enableSorting: false,
      },
    ],
    [],
  );

  if (jobs.length === 0) {
    return (
      <EmptyState
        title={t.empty.jobs}
        description="Tạo tin đầu tiên để bắt đầu nhận hồ sơ."
        action={
          <Button onClick={onCreate}>
            <span className="text-base leading-none">+</span> {t.action.create}
          </Button>
        }
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={jobs}
      onRowClick={(job) => router.push(`/tin-tuyen-dung/${job.id}`)}
      initialSorting={[{ id: "posted_at", desc: true }]}
    />
  );
}

function RowActions({ job }: { job: JobRow }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const setStatus = async (status: JobStatus) => {
    setPending(true);
    const r = await setJobStatusAction(job.id, status);
    setPending(false);
    if (!r.ok) toast.error(r.error);
    else toast.success(t.success.saved);
    router.refresh();
  };

  const archive = async () => {
    setPending(true);
    const r = await archiveJobAction(job.id);
    setPending(false);
    // archiveJobAction redirects on success — only land here if it errored
    if (r && !r.ok) toast.error(r.error);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Thao tác khác"
          onClick={(e) => e.stopPropagation()}
          disabled={pending}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => router.push(`/tin-tuyen-dung/${job.id}/sua`)}>
          <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden /> {t.action.edit}
        </DropdownMenuItem>
        {job.status === "open" && (
          <DropdownMenuItem onSelect={() => setStatus("paused")}>
            <Pause className="mr-2 h-3.5 w-3.5" aria-hidden /> Tạm dừng
          </DropdownMenuItem>
        )}
        {job.status === "paused" && (
          <DropdownMenuItem onSelect={() => setStatus("open")}>
            <Play className="mr-2 h-3.5 w-3.5" aria-hidden /> Mở lại
          </DropdownMenuItem>
        )}
        {(job.status === "open" || job.status === "paused" || job.status === "draft") && (
          <DropdownMenuItem onSelect={() => setStatus("closed")}>
            <X className="mr-2 h-3.5 w-3.5" aria-hidden /> Đóng tin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={archive} className="text-error-fg">
          <Archive className="mr-2 h-3.5 w-3.5" aria-hidden /> {t.action.archive}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
