"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { t } from "@/lib/i18n";

export function ResetForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/dat-lai-mat-khau/moi",
    });
    setSubmitting(false);
    if (resetError) {
      setError(t.error.generic);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div
        role="status"
        className="rounded-md border border-success/20 bg-success-bg/40 px-4 py-3 text-sm text-success-fg"
      >
        {t.success.passwordReset}
      </div>
    );
  }

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
        {submitting ? "Đang gửi..." : t.action.resetPassword}
      </Button>
    </form>
  );
}
