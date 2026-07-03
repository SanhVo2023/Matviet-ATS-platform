import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listJobs } from "@/server/jobs/repository";
import { buildReportPayload } from "@/server/reports/queries";
import { defaultReportFilter, parseReportFilter } from "@/server/reports/filter";
import { ReportFilters } from "@/components/features/reports/ReportFilters";
import { ExportButtons } from "@/components/features/reports/ExportButtons";
import { FunnelChart } from "@/components/features/reports/FunnelChart";
import { TimeToHireChart } from "@/components/features/reports/TimeToHireChart";
import { SourceEffectivenessTable } from "@/components/features/reports/SourceEffectivenessTable";
import { ScoreDistributionChart } from "@/components/features/reports/ScoreDistributionChart";
import { StageConversionChart } from "@/components/features/reports/StageConversionChart";
import { HiresPerMonthChart } from "@/components/features/reports/HiresPerMonthChart";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/primitives/PageHeader";
import { Stagger, StaggerItem } from "@/components/motion";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.nav.reports,
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireRole(["admin", "hr", "hiring_manager"]);

  // Flatten searchParams into a string-only record for parseReportFilter
  const sp = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) flat[k] = v[0];
    else flat[k] = v;
  }

  const filter = parseReportFilter(flat);
  const def = defaultReportFilter();
  const usingDefaults = filter.from === def.from && filter.to === def.to;

  // Run queries + jobs list in parallel
  const [payload, jobs] = await Promise.all([buildReportPayload(filter), listJobs()]);

  const hasData = payload.total_candidates > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-6 lg:p-8">
      <PageHeader
        icon={BarChart3}
        title={t.nav.reports}
        subtitle={
          <>
            {usingDefaults
              ? "30 ngày gần nhất · tất cả vị trí"
              : `${formatDate(filter.from)} — ${formatDate(filter.to)}`}
            {filter.job_id && ` · 1 vị trí`}
            {filter.role_family && ` · nhóm ${filter.role_family}`}
          </>
        }
        action={<ExportButtons />}
      />

      <ReportFilters
        jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
        initialFrom={filter.from}
        initialTo={filter.to}
        initialJobId={filter.job_id}
        initialRoleFamily={filter.role_family}
        initialSource={filter.source}
      />

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-base font-medium text-slate-700">{t.empty.reports}</p>
            <p className="mt-1 text-sm text-slate-500">
              Thử mở rộng khoảng thời gian hoặc xóa các bộ lọc.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StaggerItem>
            <ChartCard>
              <FunnelChart data={payload.funnel} />
            </ChartCard>
          </StaggerItem>
          <StaggerItem>
            <ChartCard>
              <TimeToHireChart data={payload.time_to_hire} />
            </ChartCard>
          </StaggerItem>
          <StaggerItem>
            <ChartCard>
              <SourceEffectivenessTable rows={payload.source_effectiveness} />
            </ChartCard>
          </StaggerItem>
          <StaggerItem>
            <ChartCard>
              <ScoreDistributionChart data={payload.score_distribution} />
            </ChartCard>
          </StaggerItem>
          <StaggerItem className="lg:col-span-2">
            <ChartCard>
              <StageConversionChart data={payload.stage_conversion} />
            </ChartCard>
          </StaggerItem>
          <StaggerItem className="lg:col-span-2">
            <ChartCard>
              <HiresPerMonthChart data={payload.hires_per_month} />
            </ChartCard>
          </StaggerItem>
        </Stagger>
      )}
    </div>
  );
}

function ChartCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
