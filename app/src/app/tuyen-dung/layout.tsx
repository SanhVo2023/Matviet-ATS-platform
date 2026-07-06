import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export const metadata: Metadata = {
  title: "Tuyển dụng — Mắt Việt",
  description:
    "Cơ hội nghề nghiệp tại Mắt Việt — chuỗi cửa hàng mắt kính hàng đầu Việt Nam. Ứng tuyển trực tuyến trong 2 phút.",
};

/** Public careers shell (G12) — navy header, no auth, no dashboard chrome. */
export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="bg-brand-900">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/tuyen-dung" aria-label="Tuyển dụng Mắt Việt">
            <Logo variant="on-dark" width={130} height={38} priority />
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-400">
            Tuyển dụng
          </span>
        </div>
        <div className="h-1 bg-accent-400" aria-hidden />
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 px-6 py-8 text-center text-xs text-slate-500">
        Mắt Việt — Hệ thống tuyển dụng · Thông tin của bạn được bảo mật theo Nghị định 13/2023/NĐ-CP
      </footer>
    </div>
  );
}
