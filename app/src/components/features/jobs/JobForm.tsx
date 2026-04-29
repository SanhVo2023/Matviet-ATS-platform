"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlideOver } from "@/components/primitives/SlideOver";
import { RichTextEditor } from "@/components/primitives/RichTextEditor";
import { WeightsEditor } from "./WeightsEditor";
import { RoleFamilyAndFlow } from "./RoleFamilyAndFlow";
import { HiringManagerPicker, type ManagerOption } from "./HiringManagerPicker";
import { t } from "@/lib/i18n";
import { JobInputSchema, type JobInput } from "@/lib/validation/job";
import { DEFAULT_WEIGHT_TEMPLATES } from "@/lib/constants";

interface Department {
  id: string;
  name: string;
}

interface JobFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "create" or "edit" — only differs in title + submit label. */
  mode: "create" | "edit";
  initialValues?: Partial<JobInput>;
  departments: Department[];
  managerOptions: ManagerOption[];
  onSubmit: (
    values: JobInput,
    intent: "save_draft" | "publish",
  ) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
}

const DEFAULT_VALUES: JobInput = {
  title: "",
  department_id: null,
  role_family: "sales",
  flow_type: "staff",
  description: "",
  requirements_html: "",
  location: null,
  salary_min: null,
  salary_max: null,
  headcount: 1,
  weights: DEFAULT_WEIGHT_TEMPLATES.sales,
  hiring_manager_ids: [],
};

export function JobForm({
  open,
  onOpenChange,
  mode,
  initialValues,
  departments,
  managerOptions,
  onSubmit,
}: JobFormProps) {
  const methods = useForm<JobInput>({
    resolver: zodResolver(JobInputSchema),
    defaultValues: { ...DEFAULT_VALUES, ...initialValues },
    mode: "onBlur",
  });

  // Reset on open: when editing different jobs back-to-back, keep the form fresh.
  React.useEffect(() => {
    if (open) {
      methods.reset({ ...DEFAULT_VALUES, ...initialValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues?.title]);

  const [submitting, setSubmitting] = React.useState<"save_draft" | "publish" | null>(null);

  const handle = async (intent: "save_draft" | "publish") => {
    const valid = await methods.trigger();
    if (!valid) {
      toast.error(t.error.validation);
      return;
    }
    setSubmitting(intent);
    const values = methods.getValues();
    const result = await onSubmit(values, intent);
    setSubmitting(null);
    if (result.ok) {
      toast.success(intent === "publish" ? "Đã đăng tin." : t.success.draftSaved);
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      width="xl"
      title={mode === "create" ? "Tạo tin tuyển dụng" : "Chỉnh sửa tin tuyển dụng"}
      description="Mô tả vị trí, gán phòng ban + trưởng phòng, cấu hình trọng số AI."
    >
      <FormProvider {...methods}>
        <SlideOver.Body>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <Section title="Thông tin cơ bản">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldRow label={t.jobForm.title} error={methods.formState.errors.title?.message}>
                  <Input
                    {...methods.register("title")}
                    placeholder="Vd: Nhân viên bán hàng — chi nhánh Q.1"
                  />
                </FieldRow>
                <FieldRow label={t.jobForm.headcount}>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    {...methods.register("headcount", { valueAsNumber: true })}
                  />
                </FieldRow>
                <FieldRow label={t.jobForm.department}>
                  <select
                    {...methods.register("department_id")}
                    defaultValue=""
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">— Chọn phòng ban —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </FieldRow>
                <FieldRow label={t.jobForm.location}>
                  <Input
                    {...methods.register("location")}
                    placeholder="Vd: 123 Lý Tự Trọng, Q.1, TP.HCM"
                  />
                </FieldRow>
              </div>
            </Section>

            <Section title="Loại vị trí và quy trình">
              <RoleFamilyAndFlow />
            </Section>

            <Section title={t.jobForm.description}>
              <RichTextEditor
                value={methods.watch("description")}
                onChange={(html) => methods.setValue("description", html, { shouldDirty: true })}
                placeholder="Mô tả ngắn gọn về vị trí: nhiệm vụ chính, quyền lợi, môi trường làm việc..."
              />
            </Section>

            <Section title={t.jobForm.requirements}>
              <RichTextEditor
                value={methods.watch("requirements_html")}
                onChange={(html) =>
                  methods.setValue("requirements_html", html, { shouldDirty: true })
                }
                placeholder="Yêu cầu kinh nghiệm, kỹ năng, học vấn..."
              />
            </Section>

            <Section title="Mức lương">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldRow label={t.jobForm.salaryFrom + " (VNĐ)"}>
                  <Input
                    type="number"
                    min={0}
                    step={500_000}
                    {...methods.register("salary_min", { valueAsNumber: true })}
                    placeholder="vd 7,000,000"
                  />
                </FieldRow>
                <FieldRow
                  label={t.jobForm.salaryTo + " (VNĐ)"}
                  error={methods.formState.errors.salary_max?.message}
                >
                  <Input
                    type="number"
                    min={0}
                    step={500_000}
                    {...methods.register("salary_max", { valueAsNumber: true })}
                    placeholder="vd 12,000,000"
                  />
                </FieldRow>
              </div>
            </Section>

            <Section title="Trọng số AI">
              <WeightsEditor />
            </Section>

            <Section title={t.jobForm.hiringManager}>
              <HiringManagerPicker options={managerOptions} />
              {methods.formState.errors.hiring_manager_ids?.message ? (
                <p role="alert" className="mt-1 text-sm text-error-fg">
                  {methods.formState.errors.hiring_manager_ids.message}
                </p>
              ) : null}
            </Section>
          </form>
        </SlideOver.Body>
        <SlideOver.Footer>
          <Button
            variant="ghost"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting !== null}
          >
            {t.action.cancel}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => handle("save_draft")}
            disabled={submitting !== null}
          >
            {submitting === "save_draft" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Lưu bản nháp
          </Button>
          <Button type="button" onClick={() => handle("publish")} disabled={submitting !== null}>
            {submitting === "publish" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {mode === "create" ? "Đăng tin" : "Cập nhật"}
          </Button>
        </SlideOver.Footer>
      </FormProvider>
    </SlideOver>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function FieldRow({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-error-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
