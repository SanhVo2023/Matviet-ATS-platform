"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { JobInput } from "@/lib/validation/job";

export interface ManagerOption {
  id: string;
  full_name: string | null;
  department_name?: string | null;
}

interface Props {
  /** Pre-fetched manager profiles from the server (admin/hr can see all profiles). */
  options: ManagerOption[];
}

/**
 * Multi-select for assigning hiring managers to a job. Renders a searchable
 * list of profiles with `role = 'hiring_manager'`. The corresponding
 * `job_assignments` rows are written by the server action on save.
 */
export function HiringManagerPicker({ options }: Props) {
  const { watch, setValue } = useFormContext<JobInput>();
  const selected = watch("hiring_manager_ids");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.full_name?.toLowerCase().includes(q) || o.department_name?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setValue("hiring_manager_ids", next, { shouldDirty: true, shouldValidate: true });
  };

  if (options.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Chưa có ai trong danh sách Trưởng phòng. Mời thêm tại{" "}
        <a href="/cai-dat/nguoi-dung" className="font-medium text-primary-600 hover:underline">
          Cài đặt → Người dùng
        </a>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc phòng ban"
          className="pl-9"
          aria-label="Tìm trưởng phòng"
        />
      </div>
      <div className="scrollbar-thin max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-slate-500">Không tìm thấy.</p>
        ) : (
          <ul role="listbox" aria-multiselectable>
            {filtered.map((o) => {
              const isSelected = selected.includes(o.id);
              return (
                <li key={o.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isSelected ? "bg-primary-50 text-primary-900" : "hover:bg-slate-50",
                    )}
                  >
                    <span>
                      <span className="font-medium">{o.full_name || "—"}</span>
                      {o.department_name ? (
                        <span className="ml-2 text-xs text-slate-500">({o.department_name})</span>
                      ) : null}
                    </span>
                    {isSelected ? <Check className="h-4 w-4 text-primary-600" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {selected.length > 0 ? (
        <p className="text-xs text-slate-500">Đã chọn {selected.length} trưởng phòng.</p>
      ) : null}
    </div>
  );
}
