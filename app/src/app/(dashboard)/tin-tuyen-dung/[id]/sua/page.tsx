import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getJob,
  getJobAssignments,
  listDepartments,
  listHiringManagers,
} from "@/server/jobs/repository";
import { EditJobClient } from "./EditJobClient";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return { title: job ? `Sửa: ${job.title}` : t.nav.jobs };
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "hr"]);
  const { id } = await params;

  const [job, assignments, departments, managers] = await Promise.all([
    getJob(id),
    getJobAssignments(id),
    listDepartments(),
    listHiringManagers(),
  ]);

  if (!job) notFound();

  const initialValues = {
    title: job.title,
    department_id: job.department_id,
    role_family: job.role_family,
    flow_type: job.flow_type,
    description: job.description ?? "",
    requirements_html: (job.requirements as { html?: string } | null)?.html ?? "",
    location: job.location,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    headcount: job.headcount,
    weights: job.weights as Record<
      | "industry_fit"
      | "professional_skills"
      | "work_experience"
      | "years_experience"
      | "education"
      | "location",
      number
    >,
    hiring_manager_ids: assignments.map((a) => a.manager_user_id),
  };

  return (
    <EditJobClient
      jobId={job.id}
      initialValues={initialValues}
      departments={departments}
      managerOptions={managers.map((m) => ({
        id: m.id,
        full_name: m.full_name,
        department_name: m.department_name,
      }))}
    />
  );
}
