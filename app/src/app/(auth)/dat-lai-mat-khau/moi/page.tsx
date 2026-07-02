import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPasswordForm } from "./NewPasswordForm";

export const metadata: Metadata = { title: "Đặt mật khẩu mới" };

export default function NewPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Đặt mật khẩu mới</h1>
        <p className="mt-1 text-sm text-slate-500">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      </div>
      {/* useSearchParams (reset token) requires a Suspense boundary at build time */}
      <Suspense fallback={null}>
        <NewPasswordForm />
      </Suspense>
    </div>
  );
}
