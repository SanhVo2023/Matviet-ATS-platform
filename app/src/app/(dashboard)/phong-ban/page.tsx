import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import {
  listDepartmentsWithMeta,
  listPositions,
  listDepartmentOptions,
  listHeadOptions,
} from "@/server/org/repository";
import { OrgClient } from "@/components/features/org/OrgClient";
import { PageContainer } from "@/components/primitives/PageContainer";
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
    <PageContainer size="default">
      <OrgClient
        departments={departments}
        positions={positions}
        departmentOptions={departmentOptions.map((d) => ({ id: d.id, name: d.name }))}
        heads={heads}
      />
    </PageContainer>
  );
}
