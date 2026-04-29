"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n";
import { gradeSubmissionAction } from "@/app/(dashboard)/ung-vien/[id]/actions";

export function GradeSubmissionForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [score, setScore] = React.useState(70);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await gradeSubmissionAction({
      submission_id: submissionId,
      score,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã chấm điểm.");
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-slate-200 bg-white p-4"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="grade-score">{t.assessment.gradeLabel}</Label>
          <span className="font-mono text-sm font-medium text-slate-700">{score}</span>
        </div>
        <Slider
          id="grade-score"
          min={0}
          max={100}
          step={1}
          value={[score]}
          onValueChange={(v) => setScore(v[0] ?? 0)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="grade-notes">{t.assessment.gradeNotesLabel}</Label>
        <Textarea
          id="grade-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="VD: Cú pháp đúng, logic rõ ràng, thiếu test cases."
          lang="vi"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting ? "Đang lưu…" : t.assessment.grade}
        </Button>
      </div>
    </form>
  );
}
