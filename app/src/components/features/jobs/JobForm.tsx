"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Sparkles } from "lucide-react";
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
import { JobInputSchema, type JobInput, type JobInputValues } from "@/lib/validation/job";
import { DEFAULT_WEIGHT_TEMPLATES } from "@/lib/constants";
import { generateJobContentAction, suggestWeightsAction } from "@/app/(dashboard)/vi-tri/actions";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const methods = useForm<JobInputValues, unknown, JobInput>({
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
  const [generating, setGenerating] = React.useState(false);
  // ADR 0015: create mode shows 3 essential fields; everything else folds
  // under "Nâng cao". Edit mode opens expanded (you came to change details).
  const [advancedOpen, setAdvancedOpen] = React.useState(mode === "edit");
  const watchedTitle = methods.watch("title");

  React.useEffect(() => {
    if (open) setAdvancedOpen(mode === "edit");
  }, [open, mode]);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await generateJobContentAction({
      title: methods.getValues("title"),
      role_family: methods.getValues("role_family"),
      location: methods.getValues("location"),
    });
    setGenerating(false);
    if (res.ok && res.data) {
      methods.setValue("description", res.data.description_html, { shouldDirty: true });
      methods.setValue("requirements_html", res.data.requirements_html, { shouldDirty: true });
      toast.success("AI đã soạn mô tả và yêu cầu — hãy đọc lại và chỉnh sửa trước khi lưu.");
    } else {
      toast.error(res.ok ? "Lỗi tạo nội dung bằng AI" : res.error);
    }
  };

  /** One click: AI writes description + requirements AND proposes weights. */
  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      const [content, weights] = await Promise.all([
        generateJobContentAction({
          title: methods.getValues("title"),
          role_family: methods.getValues("role_family"),
          location: methods.getValues("location"),
        }),
        suggestWeightsAction({
          title: methods.getValues("title"),
          role_family: methods.getValues("role_family"),
          description: null,
        }),
      ]);
      if (content.ok && content.data) {
        methods.setValue("description", content.data.description_html, { shouldDirty: true });
        methods.setValue("requirements_html", content.data.requirements_html, {
          shouldDirty: true,
        });
      }
      if (weights.ok && weights.data) {
        methods.setValue("weights", weights.data.weights as JobInput["weights"], {
          shouldDirty: true,
        });
      }
      if (content.ok) {
        toast.success(
          "AI đã soạn mô tả, yêu cầu và trọng số chấm điểm — mở «Nâng cao» nếu muốn chỉnh.",
        );
      } else {
        toast.error(content.error);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handle = async (intent: "save_draft" | "publish") => {
    const valid = await methods.trigger();
    if (!valid) {
      toast.error(t.error.validation);
      return;
    }
    setSubmitting(intent);
    try {
      // trigger() validated already; parse applies defaults + number coercion
      // (form values are the schema's INPUT type since zod 4 / resolvers 5).
      const values = JobInputSchema.parse(methods.getValues());
      const result = await onSubmit(values, intent);
      if (result.ok) {
        toast.success(intent === "publish" ? "Đã đăng tuyển." : t.success.draftSaved);
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      // parse/resolver divergence must not leave the button stuck loading
      toast.error(t.error.validation);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      width="xl"
      title={mode === "create" ? "Tạo vị trí" : "Chỉnh sửa vị trí"}
      description="Mô tả vị trí, gán phòng ban + trưởng phòng, cấu hình trọng số AI."
    >
      <FormProvider {...methods}>
        <SlideOver.Body>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Essentials — 3 fields is all a quick post needs (ADR 0015) */}
            <Section title="Thông tin cơ bản">
              <FieldRow label={t.jobForm.title} error={methods.formState.errors.title?.message}>
                <Input
                  {...methods.register("title")}
                  placeholder="Vd: Nhân viên bán hàng — chi nhánh Q.1"
                />
              </FieldRow>
              <RoleFamilyAndFlow />
              <FieldRow label={t.jobForm.location}>
                <Input
                  {...methods.register("location")}
                  placeholder="Vd: 123 Lý Tự Trọng, Q.1, TP.HCM"
                />
              </FieldRow>
            </Section>

            <div className="rounded-lg border border-accent-400/40 bg-accent-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-900">✨ Để AI soạn phần còn lại</p>
                  <p className="text-xs text-slate-600">
                    Mô tả công việc, yêu cầu ứng viên và trọng số chấm điểm — bạn chỉ đọc lại và
                    chỉnh nếu cần.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleGenerateAll}
                  disabled={generating || submitting !== null || !watchedTitle?.trim()}
                  title={!watchedTitle?.trim() ? "Nhập chức danh trước" : undefined}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden />
                  )}
                  {generating ? "Đang soạn…" : "AI soạn toàn bộ"}
                </Button>
              </div>
            </div>

            {/* Everything else lives behind one toggle */}
            <button
              type="button"
              onClick={() => setAdvancedOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              aria-expanded={advancedOpen}
            >
              Tuỳ chọn nâng cao (mô tả, lương, trọng số, phòng ban…)
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")}
                aria-hidden
              />
            </button>

            {advancedOpen && (
              <div className="space-y-6">
                <Section title="Chỉ tiêu & phòng ban">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  </div>
                </Section>

                <Section title={t.jobForm.description}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {watchedTitle?.trim()
                        ? "AI soạn nháp mô tả + yêu cầu từ chức danh — bạn duyệt lại trước khi lưu."
                        : "Nhập chức danh ở trên để dùng AI soạn nháp."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={generating || submitting !== null || !watchedTitle?.trim()}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="h-4 w-4" aria-hidden />
                      )}
                      {generating ? "Đang soạn..." : "Viết bằng AI"}
                    </Button>
                  </div>
                  <RichTextEditor
                    value={methods.watch("description") ?? ""}
                    onChange={(html) =>
                      methods.setValue("description", html, { shouldDirty: true })
                    }
                    placeholder="Mô tả ngắn gọn về vị trí: nhiệm vụ chính, quyền lợi, môi trường làm việc..."
                  />
                </Section>

                <Section title={t.jobForm.requirements}>
                  <RichTextEditor
                    value={methods.watch("requirements_html") ?? ""}
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
                  <p className="mt-1 text-xs text-slate-500">
                    Không bắt buộc — chưa gán thì thông báo duyệt sẽ tới HR/Admin.
                  </p>
                </Section>
              </div>
            )}
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
            {mode === "create" ? "Đăng tuyển" : "Cập nhật"}
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
