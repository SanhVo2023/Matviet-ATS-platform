import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetForm } from "./ResetForm";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.resetTitle };

export default function ResetPasswordPage() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle>{t.auth.resetTitle}</CardTitle>
        <CardDescription>{t.auth.resetSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResetForm />
        <p className="text-center text-sm text-slate-500">
          <Link href="/dang-nhap" className="font-medium text-primary-600 hover:underline">
            {t.action.back} {t.auth.loginTitle.toLowerCase()}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
