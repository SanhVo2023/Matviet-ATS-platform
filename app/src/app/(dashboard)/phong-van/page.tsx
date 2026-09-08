import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, MapPin, Phone, Video } from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  listInterviews,
  listInterviewsOwedEvaluation,
  type InterviewRow,
} from "@/server/interviews/repository";
import { getCandidate } from "@/server/candidates/repository";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/PageHeader";
import { EmptyState } from "@/components/primitives/EmptyState";
import { PageContainer } from "@/components/primitives/PageContainer";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatDateTime, formatRelative } from "@/lib/vi-format";

const TYPE_ICON = { in_person: MapPin, phone: Phone, video: Video } as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: t.nav.interviews };

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  const tab = (await searchParams).tab === "cho-danh-gia" ? "cho-danh-gia" : "sap-toi";
  const forUserId = profile.role === "hiring_manager" ? profile.id : undefined;

  const owed = await listInterviewsOwedEvaluation({ forUserId });
  const list =
    tab === "cho-danh-gia"
      ? owed
      : await listInterviews({ upcoming_only: true, for_user_id: forUserId });

  // Resolve candidate names — interviews don't denormalize them.
  const candidateIds = Array.from(new Set(list.map((i) => i.candidate_id)));
  const candidates = await Promise.all(candidateIds.map((id) => getCandidate(id)));
  const candidateById = new Map(
    candidates.filter((c): c is NonNullable<typeof c> => !!c).map((c) => [c.id, c]),
  );

  const tabClass = (active: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
      active ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
    );

  return (
    <PageContainer size="detail" className="space-y-4">
      <PageHeader
        icon={Calendar}
        title={t.nav.interviews}
        subtitle={
          profile.role === "hiring_manager"
            ? "Lịch phỏng vấn bạn được mời tham dự."
            : "Lịch phỏng vấn sắp tới và các buổi chờ đánh giá."
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/phong-van?tab=sap-toi" className={tabClass(tab === "sap-toi")}>
          Sắp tới
        </Link>
        <Link href="/phong-van?tab=cho-danh-gia" className={tabClass(tab === "cho-danh-gia")}>
          Chờ đánh giá{owed.length > 0 ? ` (${owed.length})` : ""}
        </Link>
      </div>

      {list.length === 0 ? (
        tab === "cho-danh-gia" ? (
          <EmptyState
            illustration="check"
            title="Không có buổi phỏng vấn nào chờ đánh giá"
            description="Mọi buổi phỏng vấn đã hoàn thành đều đã có đánh giá."
          />
        ) : (
          <EmptyState
            illustration="calendar"
            title={t.empty.interviewsUpcoming}
            description="Đặt lịch ngay trên thang ứng viên — nấc 'Đánh giá' có nút đặt lịch, kèm câu hỏi phỏng vấn do AI soạn sẵn."
            action={
              profile.role !== "hiring_manager" ? (
                <Button asChild>
                  <Link href="/ung-vien?stage=evaluating">Mở ứng viên đang đánh giá</Link>
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {list.map((iv: InterviewRow) => {
            const c = candidateById.get(iv.candidate_id);
            const TypeIcon = TYPE_ICON[iv.type] ?? Calendar;
            const isTeams = iv.type === "video" && !!iv.location_or_link;
            return (
              <li key={iv.id}>
                <Link
                  href={`/phong-van/${iv.id}`}
                  className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="w-32 shrink-0 border-r border-slate-100 pr-4 text-left">
                    <p className="text-sm font-bold tabular-nums text-brand-900">
                      {formatDateTime(iv.scheduled_at)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-2xs uppercase tracking-wide text-slate-500">
                      <TypeIcon className="h-3 w-3 shrink-0" aria-hidden />
                      {iv.duration_min} phút
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {c?.full_name ?? "—"}{" "}
                      <span className="text-xs font-normal text-slate-500">· {c?.email ?? ""}</span>
                    </p>
                    {isTeams ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                        <Video className="h-3 w-3" aria-hidden /> {t.interviewType.video}
                      </span>
                    ) : iv.location_or_link ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {iv.location_or_link}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-500">{t.interviewType[iv.type]}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-2xs uppercase tracking-wide text-slate-400">
                    {formatRelative(iv.scheduled_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
