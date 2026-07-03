"use client";

import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Dashboard error boundary — keeps the shell alive and offers a retry. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="text-xl font-bold text-slate-900">Đã xảy ra lỗi</h1>
      <p className="max-w-md text-sm text-slate-500">
        Trang không tải được. Thử lại — nếu vẫn lỗi, chụp màn hình này và báo cho quản trị viên.
        {error.digest && (
          <span className="mt-1 block font-mono text-xs text-slate-400">
            Mã lỗi: {error.digest}
          </span>
        )}
      </p>
      <Button onClick={reset}>
        <RefreshCcw className="h-4 w-4" aria-hidden /> Thử lại
      </Button>
    </div>
  );
}
