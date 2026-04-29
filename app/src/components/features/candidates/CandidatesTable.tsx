"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/primitives/DataTable";
import { EmptyState } from "@/components/primitives/EmptyState";
import { StageBadge } from "@/components/primitives/StatusBadge";
import { t } from "@/lib/i18n";
import { formatDate, initials } from "@/lib/vi-format";
import type { CandidateRow } from "@/server/candidates/repository";
import { Users } from "lucide-react";

interface JobLite {
  id: string;
  title: string;
}

interface Props {
  candidates: CandidateRow[];
  jobsById: Record<string, JobLite>;
  onCreate: () => void;
}

export function CandidatesTable({ candidates, jobsById, onCreate }: Props) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<CandidateRow>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: () => <span>Ứng viên</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials(row.original.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-900">{row.original.full_name}</p>
              <p className="text-xs text-slate-500">{row.original.email ?? "—"}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: () => <span>SĐT</span>,
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        accessorKey: "job_id",
        header: () => <span>Vị trí</span>,
        cell: ({ row }) => jobsById[row.original.job_id]?.title ?? "—",
      },
      {
        accessorKey: "source",
        header: () => <span>Nguồn</span>,
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">{t.source[row.original.source]}</span>
        ),
      },
      {
        accessorKey: "ai_score",
        header: () => <span>Điểm AI</span>,
        cell: ({ row }) =>
          row.original.ai_score == null ? (
            <span className="text-slate-400">—</span>
          ) : (
            <span className="font-mono tabular-nums">{Math.round(row.original.ai_score)}</span>
          ),
      },
      {
        accessorKey: "current_stage",
        header: () => <span>Giai đoạn</span>,
        cell: ({ row }) => <StageBadge stage={row.original.current_stage} />,
      },
      {
        accessorKey: "created_at",
        header: () => <span>Ngày nộp</span>,
        cell: ({ row }) => formatDate(row.original.created_at),
      },
    ],
    [jobsById],
  );

  if (candidates.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t.empty.candidates}
        action={
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Tải lên ứng viên đầu tiên
          </button>
        }
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={candidates}
      onRowClick={(c) => router.push(`/ung-vien/${c.id}`)}
      initialSorting={[{ id: "created_at", desc: true }]}
    />
  );
}
