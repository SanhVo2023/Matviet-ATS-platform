"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { convertCandidateAction } from "@/app/(dashboard)/nhan-vien/actions";
import { t } from "@/lib/i18n";

/** Manual candidate → employee conversion (the auto path runs on hire). */
export function ConvertCandidateButton({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function convert() {
    setBusy(true);
    const res = await convertCandidateAction(candidateId);
    setBusy(false);
    if (res.ok && res.data) {
      toast.success(res.data.created ? t.employee.converted : t.employee.alreadyEmployee);
      router.push(`/nhan-vien/${res.data.id}`);
    } else if (!res.ok) {
      toast.error(res.error);
    }
  }

  return (
    <Button onClick={() => void convert()} disabled={busy}>
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" aria-hidden />
      )}
      {t.employee.convertCta}
    </Button>
  );
}
