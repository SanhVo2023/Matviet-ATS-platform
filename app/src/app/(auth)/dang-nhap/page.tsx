import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.loginTitle };

export default function LoginPage() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle>{t.auth.loginTitle}</CardTitle>
        <CardDescription>{t.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-32" aria-hidden />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
