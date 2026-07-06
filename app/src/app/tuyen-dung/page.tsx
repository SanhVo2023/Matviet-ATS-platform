import Link from "next/link";
import { MapPin, Users, ArrowRight, Briefcase } from "lucide-react";
import { listOpenJobs } from "@/server/apply/service";
import { formatVND } from "@/lib/vi-format";

export const dynamic = "force-dynamic";

function salaryLabel(min: number | null, max: number | null): string {
  if (min && max) return `${formatVND(min)} – ${formatVND(max)}`;
  if (min) return `Từ ${formatVND(min)}`;
  if (max) return `Đến ${formatVND(max)}`;
  return "Thỏa thuận";
}

/** Public job board (G12) — every open job, newest first. */
export default async function CareersListPage() {
  const jobs = await listOpenJobs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Cơ hội nghề nghiệp tại Mắt Việt</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gia nhập chuỗi cửa hàng mắt kính hàng đầu Việt Nam. Ứng tuyển trực tuyến chỉ trong 2 phút
          — chúng tôi phản hồi trong vòng 5 ngày làm việc.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm text-slate-500">
            Hiện chưa có vị trí nào đang tuyển. Vui lòng quay lại sau!
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/tuyen-dung/${job.id}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold text-brand-900 group-hover:text-primary-700">
                    {job.title}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {job.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {job.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {job.headcount} vị trí
                    </span>
                    <span className="font-medium text-emerald-700">
                      {salaryLabel(job.salary_min, job.salary_max)}
                    </span>
                  </div>
                </div>
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-primary-500"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
