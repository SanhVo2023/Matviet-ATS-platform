import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, MapPin, Phone, Video } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listInterviews } from "@/server/interviews/repository";
import { getCandidate } from "@/server/candidates/repository";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/primitives/PageHeader";
import { t } from "@/lib/i18n";
import { formatDateTime, formatRelative } from "@/lib/vi-format";

const TYPE_ICON = { in_person: MapPin, phone: Phone, video: Video } as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: t.nav.interviews };

export default async function InterviewsPage() {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);

  // HR/admin see all upcoming + recently-completed; managers only see their own.
  const upcoming = await listInterviews({
    upcoming_only: true,
    for_user_id: profile.role === "hiring_manager" ? profile.id : undefined,
  });

  // Resolve candidate names — interviews don't denormalize them.
  const candidateIds = Array.from(new Set(upcoming.map((i) => i.candidate_id)));
  const candidates = await Promise.all(candidateIds.map((id) => getCandidate(id)));
  const candidateById = new Map(
    candidates.filter((c): c is NonNullable<typeof c> => !!c).map((c) => [c.id, c]),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6 lg:p-8">
      <PageHeader
        icon={Calendar}
        title={t.nav.interviews}
        subtitle={
          profile.role === "hiring_manager"
            ? "Lịch phỏng vấn bạn được mời tham dự."
            : "Toàn bộ lịch phỏng vấn sắp tới."
        }
      />

      {upcoming.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Calendar className="h-8 w-8 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-slate-700">{t.empty.interviewsUpcoming}</p>
            <p className="text-xs text-slate-500">
              Đặt lịch từ trang chi tiết ứng viên (tab Phỏng vấn).
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {upcoming.map((iv) => {
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
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
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
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                    {formatRelative(iv.scheduled_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
