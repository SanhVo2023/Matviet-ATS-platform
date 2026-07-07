"use client";

import { useRouter } from "next/navigation";
import { JobForm } from "@/components/features/jobs/JobForm";
import type { JobInput } from "@/lib/validation/job";
import type { ManagerOption } from "@/components/features/jobs/HiringManagerPicker";
import { updateJobAction } from "@/app/(dashboard)/vi-tri/actions";

interface Props {
  jobId: string;
  initialValues: Partial<JobInput>;
  departments: { id: string; name: string }[];
  managerOptions: ManagerOption[];
}

export function EditJobClient({ jobId, initialValues, departments, managerOptions }: Props) {
  const router = useRouter();

  const onSubmit = async (
    values: JobInput,
    intent: "save_draft" | "publish",
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const r = await updateJobAction(jobId, values, intent);
    if (!r.ok) return r;
    router.push(`/vi-tri/${jobId}`);
    router.refresh();
    return { ok: true, id: jobId };
  };

  return (
    <JobForm
      open
      onOpenChange={(o) => {
        if (!o) router.push(`/vi-tri/${jobId}`);
      }}
      mode="edit"
      initialValues={initialValues}
      departments={departments}
      managerOptions={managerOptions}
      onSubmit={onSubmit}
    />
  );
}
