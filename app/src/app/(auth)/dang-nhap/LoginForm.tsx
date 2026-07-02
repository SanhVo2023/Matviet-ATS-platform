"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { t } from "@/lib/i18n";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const errorParam = search.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "inactive" ? "Tài khoản đã bị vô hiệu. Liên hệ quản trị viên." : null,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await authClient.signIn.email({ email, password });
    if (signInError) {
      setError(t.error.invalidCredentials);
      setSubmitting(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">{t.auth.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.auth.emailPlaceholder}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t.auth.passwordLabel}</Label>
          <Link
            href="/dat-lai-mat-khau"
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            {t.action.forgotPassword}
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label={showPassword ? t.action.hidePassword : t.action.showPassword}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-error/30 bg-error-bg/40 px-3 py-2 text-sm text-error-fg"
        >
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitting ? "Đang đăng nhập..." : t.action.signIn}
      </Button>
    </form>
  );
}
