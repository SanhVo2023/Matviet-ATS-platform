import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import { getPublicJob } from "@/server/apply/service";
import { formatVND, formatDate } from "@/lib/vi-format";
import { ApplyForm } from "@/components/features/careers/ApplyForm";

export const dynamic = "force-dynamic";

function salaryLabel(min: number | null, max: number | null): string {
  if (min && max) return `${formatVND(min)} – ${formatVND(max)}`;
  if (min) return `Từ ${formatVND(min)}`;
  if (max) return `Đến ${formatVND(max)}`;
  return "Thỏa thuận";
}

/** Public job detail + apply form (G12). QR posters point here. */
export default async function CareersJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const job = await getPublicJob(id);
  if (!job) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/tuyen-dung"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Tất cả vị trí
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-brand-900">{job.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden />
              {job.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" aria-hidden />
            {job.headcount} vị trí
          </span>
          <span className="font-semibold text-emerald-700">
            {salaryLabel(job.salary_min, job.salary_max)}
          </span>
          {job.posted_at && <span>Đăng ngày {formatDate(job.posted_at)}</span>}
        </div>
        {job.description && (
          <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-slate-700">
            {job.description}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-900">Ứng tuyển vị trí này</h2>
        <p className="mt-1 text-sm text-slate-500">
          Điền thông tin và đính kèm CV (PDF, tối đa 10 MB). Chúng tôi sẽ phản hồi qua email trong
          vòng 5 ngày làm việc.
        </p>
        <div className="mt-5">
          <ApplyForm jobId={job.id} jobTitle={job.title} />
        </div>
      </div>
    </div>
  );
}
