import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listJobs, listDepartments, listHiringManagers } from "@/server/jobs/repository";
import { JobsListClient } from "@/components/features/jobs/JobsListClient";
import { t } from "@/lib/i18n";

/**
 * Same content as /tin-tuyen-dung but with the create slide-over auto-opened.
 * Allows direct URL deep-link from emails / shortcuts to open the form.
 */
export const metadata: Metadata = { title: `Tạo tin tuyển dụng · ${t.nav.jobs}` };
export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  await requireRole(["admin", "hr"]);

  const [jobs, departments, managers] = await Promise.all([
    listJobs(),
    listDepartments(),
    listHiringManagers(),
  ]);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <JobsListClient
        initialJobs={jobs}
        departments={departments}
        managerOptions={managers.map((m) => ({
          id: m.id,
          full_name: m.full_name,
          department_name: m.department_name,
        }))}
        forceCreateOpen
      />
    </div>
  );
}
