"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StageBadge } from "@/components/primitives/StatusBadge";
import { allowedNextStages, type Stage } from "@/lib/validation/candidate";
import { changeStageAction } from "@/app/(dashboard)/ung-vien/actions";
import { t } from "@/lib/i18n";

interface Props {
  candidateId: string;
  currentStage: Stage;
  /** Disable transitions (e.g. for non-HR users with read-only access). */
  readOnly?: boolean;
}

export function StageDropdown({ candidateId, currentStage, readOnly }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const allowed = allowedNextStages(currentStage);

  const change = async (next: Stage) => {
    setPending(true);
    const r = await changeStageAction(candidateId, next);
    setPending(false);
    if (!r.ok) toast.error(r.error);
    else toast.success(t.success.saved);
    router.refresh();
  };

  if (readOnly || allowed.length === 0) {
    return <StageBadge stage={currentStage} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-60"
          aria-label="Đổi giai đoạn"
        >
          <StageBadge stage={currentStage} />
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {allowed.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => change(s)}>
            {t.stage[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
