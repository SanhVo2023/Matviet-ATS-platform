"use client";

import * as React from "react";
import { ChevronDown, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generateInterviewQuestionsAction } from "@/app/(dashboard)/phong-van/actions";

interface Props {
  interviewId: string;
}

/**
 * Collapsible card suggesting interview questions grounded in the candidate's
 * CV + AI screening. Generated on demand, never persisted — the interviewer
 * copies what they find useful.
 */
export function AiQuestionsCard({ interviewId }: Props) {
  const [questions, setQuestions] = React.useState<string[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(true);

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateInterviewQuestionsAction(interviewId);
    setLoading(false);
    if (res.ok && res.data) {
      setQuestions(res.data.questions);
      setOpen(true);
    } else {
      toast.error(res.ok ? "Không tạo được câu hỏi" : res.error);
    }
  };

  const handleCopyAll = async () => {
    if (!questions) return;
    try {
      await navigator.clipboard.writeText(questions.map((q, i) => `${i + 1}. ${q}`).join("\n"));
      toast.success("Đã sao chép danh sách câu hỏi.");
    } catch {
      toast.error("Không sao chép được — trình duyệt chặn clipboard.");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {questions ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
                aria-expanded={open}
              >
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")}
                  aria-hidden
                />
                Câu hỏi phỏng vấn gợi ý
              </button>
            ) : (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Câu hỏi phỏng vấn gợi ý
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {questions && (
              <Button type="button" variant="ghost" size="sm" onClick={handleCopyAll}>
                <Copy className="h-4 w-4" aria-hidden />
                Sao chép
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {loading ? "Đang tạo..." : questions ? "Tạo lại" : "Gợi ý câu hỏi"}
            </Button>
          </div>
        </div>

        {!questions && !loading && (
          <p className="mt-2 text-xs text-slate-500">
            AI đề xuất 6-8 câu hỏi dựa trên CV của ứng viên và yêu cầu vị trí — điểm mạnh cần xác
            minh và khoảng trống cần đào sâu.
          </p>
        )}

        {questions && open && (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700" lang="vi">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
