"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { ROLE_FAMILIES, type JobInput, type Weights } from "@/lib/validation/job";
import { DEFAULT_WEIGHT_TEMPLATES } from "@/lib/constants";

const ROLE_FAMILY_DESCRIPTION: Record<(typeof ROLE_FAMILIES)[number], string> = {
  sales: "Nhân viên bán hàng tại cửa hàng",
  optician: "Đo khúc xạ, gọt mài tròng kính",
  office: "Hành chính, nhân sự, kế toán, marketing",
  manager: "Trưởng cửa hàng, quản lý chuỗi",
  custom: "Vị trí đặc thù — tự cấu hình trọng số",
};

/**
 * Combined role family + flow type selector. Selecting a role family auto-loads
 * the matching weights template (the user can still tweak after).
 *
 * Flow type drives the approval preset: staff = 3 steps, management = 4 steps
 * (HR + manager → BOD → Tập đoàn → offer).
 */
export function RoleFamilyAndFlow() {
  const { watch, setValue } = useFormContext<JobInput>();
  const family = watch("role_family");
  const flow = watch("flow_type");

  const onFamily = (f: (typeof ROLE_FAMILIES)[number]) => {
    setValue("role_family", f, { shouldDirty: true });
    if (f !== "custom") {
      const tpl = DEFAULT_WEIGHT_TEMPLATES[f] as Weights | undefined;
      if (tpl) setValue("weights", tpl, { shouldDirty: true, shouldValidate: true });
    }
    // Default management family → management flow
    if (f === "manager") setValue("flow_type", "management", { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">{t.jobForm.roleFamily}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ROLE_FAMILIES.map((f) => {
            const active = family === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onFamily(f)}
                aria-pressed={active}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  active
                    ? "border-primary-500 bg-primary-50 text-primary-900 ring-2 ring-primary-200"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <p className="text-sm font-medium">{t.roleFamily[f]}</p>
                <p className="mt-0.5 text-xs text-slate-500">{ROLE_FAMILY_DESCRIPTION[f]}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">{t.jobForm.flowType.label}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["staff", "management"] as const).map((f) => {
            const active = flow === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setValue("flow_type", f, { shouldDirty: true })}
                aria-pressed={active}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  active
                    ? "border-primary-500 bg-primary-50 text-primary-900 ring-2 ring-primary-200"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <p className="text-sm font-medium">
                  {f === "staff" ? t.jobForm.flowType.staff : t.jobForm.flowType.management}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {f === "staff"
                    ? "HR + TP đề xuất → HR deal lương → Offer"
                    : "HR + TP đề xuất → BOD → Tập đoàn → Offer"}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
