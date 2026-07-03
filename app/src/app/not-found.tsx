import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
      <p className="text-6xl font-black tabular-nums text-brand-navy" aria-hidden>
        404
      </p>
      <h1 className="text-xl font-bold text-slate-900">Không tìm thấy trang</h1>
      <p className="max-w-md text-sm text-slate-500">
        Trang này không tồn tại hoặc bạn không có quyền truy cập.
      </p>
      <Button asChild>
        <Link href="/">Về trang chính</Link>
      </Button>
    </div>
  );
}
