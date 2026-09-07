import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { getCurrentProfile } from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/safe-next";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.loginTitle };

/**
 * Server component so "already signed in?" is answered by a REAL session
 * lookup, not cookie presence — the middleware no longer bounces
 * cookie-holders off this page (redirect-loop fix, renovation R0).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (profile?.is_active) redirect(sanitizeNextPath(params.next));

  // Cookie present but no valid session → the browser is holding a dead
  // cookie (revoked/expired session). LoginForm clears it client-side.
  const cookieStore = await cookies();
  const staleSession =
    !profile && cookieStore.getAll().some((c) => c.name.includes("session_token"));

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle>{t.auth.loginTitle}</CardTitle>
        <CardDescription>{t.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-32" aria-hidden />}>
          <LoginForm staleSession={staleSession} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
