"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerScoringAction } from "@/app/(dashboard)/ung-vien/[id]/actions";
import { t } from "@/lib/i18n";

interface Props {
  candidateId: string;
  variant?: "rescore" | "retry";
  className?: string;
}

export function RescoreButton({ candidateId, variant = "rescore", className }: Props) {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const onClick = () => {
    startTransition(async () => {
      const res = await triggerScoringAction(candidateId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t.score.runningHint);
      router.refresh();
    });
  };

  const label = variant === "retry" ? t.score.retry : t.score.rescore;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
      className={className}
    >
      <RefreshCcw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
      {label}
    </Button>
  );
}
