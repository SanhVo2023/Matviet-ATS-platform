import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import {
  listJobs,
  listDepartments,
  listHiringManagers,
  countCandidatesByJob,
} from "@/server/jobs/repository";
import { JobsListClient } from "@/components/features/jobs/JobsListClient";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.nav.jobs };
export const dynamic = "force-dynamic";

export default async function JobsListPage() {
  await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);

  const [jobs, departments, managers, counts] = await Promise.all([
    listJobs(),
    listDepartments(),
    listHiringManagers(),
    countCandidatesByJob(),
  ]);
  const countsByJob = Object.fromEntries(counts.map((c) => [c.job_id, c]));

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <JobsListClient
        initialJobs={jobs}
        candidateCounts={countsByJob}
        departments={departments}
        managerOptions={managers.map((m) => ({
          id: m.id,
          full_name: m.full_name,
          department_name: m.department_name,
        }))}
      />
    </div>
  );
}
