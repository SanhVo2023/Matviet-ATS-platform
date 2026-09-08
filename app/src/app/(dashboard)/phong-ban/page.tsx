import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import {
  listDepartmentsWithMeta,
  listPositions,
  listDepartmentOptions,
  listHeadOptions,
} from "@/server/org/repository";
import { OrgClient } from "@/components/features/org/OrgClient";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.department.title };

export default async function OrgPage() {
  await requireRole(["admin", "hr"]);

  const [departments, positions, departmentOptions, heads] = await Promise.all([
    listDepartmentsWithMeta(),
    listPositions(),
    listDepartmentOptions(),
    listHeadOptions(),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <OrgClient
        departments={departments}
        positions={positions}
        departmentOptions={departmentOptions.map((d) => ({ id: d.id, name: d.name }))}
        heads={heads}
      />
    </div>
  );
}
