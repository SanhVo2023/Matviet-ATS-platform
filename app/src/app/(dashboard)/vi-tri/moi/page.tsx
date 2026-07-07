import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listDepartments, listHiringManagers } from "@/server/jobs/repository";
import { CreateJobClient } from "./CreateJobClient";
import { t } from "@/lib/i18n";

/**
 * Create-position deep link (dashboard "Tạo vị trí mới", emails, shortcuts).
 * The form slide-over opens immediately; save → the new workspace, close → "/".
 */
export const metadata: Metadata = { title: `Tạo vị trí · ${t.nav.jobs}` };
export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  await requireRole(["admin", "hr"]);

  const [departments, managers] = await Promise.all([listDepartments(), listHiringManagers()]);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <CreateJobClient
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
