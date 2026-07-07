"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { JobForm } from "@/components/features/jobs/JobForm";
import type { JobInput } from "@/lib/validation/job";
import type { ManagerOption } from "@/components/features/jobs/HiringManagerPicker";
import { createJobAction } from "@/app/(dashboard)/vi-tri/actions";

interface Department {
  id: string;
  name: string;
}

/**
 * /vi-tri/moi — the create form opens immediately over the dashboard-era
 * chrome (the standalone jobs list is gone; positions live on "/").
 * Save → straight to the new position's workspace; close → back to "/".
 */
export function CreateJobClient({
  departments,
  managerOptions,
}: {
  departments: Department[];
  managerOptions: ManagerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);

  const onSubmit = async (
    values: JobInput,
    intent: "save_draft" | "publish",
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const r = await createJobAction(values, intent);
    if (!r.ok) return r;
    const id = r.data?.id ?? "";
    router.push(id ? `/vi-tri/${id}` : "/");
    return { ok: true, id };
  };

  return (
    <JobForm
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) router.push("/");
      }}
      mode="create"
      departments={departments}
      managerOptions={managerOptions}
      onSubmit={onSubmit}
    />
  );
}
