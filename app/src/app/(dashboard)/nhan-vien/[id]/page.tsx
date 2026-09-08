import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getEmployeeDetail, listManagerOptions } from "@/server/employees/repository";
import { listDepartmentOptions, listPositionOptions } from "@/server/org/repository";
import { EmployeeProfile } from "@/components/features/employees/EmployeeProfile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getEmployeeDetail(id);
  return { title: detail ? detail.person.full_name : "Nhân viên" };
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "hr"]);
  const { id } = await params;

  const [detail, departments, positions, managers] = await Promise.all([
    getEmployeeDetail(id),
    listDepartmentOptions(),
    listPositionOptions(),
    listManagerOptions(),
  ]);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <EmployeeProfile
        detail={detail}
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        positions={positions.map((p) => ({ id: p.id, label: p.title }))}
        managers={managers.map((m) => ({ id: m.id, label: m.name }))}
      />
    </div>
  );
}
