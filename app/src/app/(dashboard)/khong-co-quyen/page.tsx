import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Không có quyền truy cập" };

// Auth-gated: reads the session (better-auth), which is unavailable at build
// time (Worker secrets are runtime-only). Force dynamic so it is never
// statically prerendered — matches every other (dashboard) route.
export const dynamic = "force-dynamic";

/** Landing page for requireRole failures — replaces the old silent
 * redirect("/") that made wrong-role clicks look like a broken app. */
export default async function NoPermissionPage() {
  const profile = await requireSession();
  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <EmptyState
        icon={ShieldX}
        title="Bạn không có quyền xem trang này"
        description={`Tài khoản của bạn (${t.userRole[profile.role]}) không được cấp quyền truy cập nội dung vừa mở. Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ quản trị viên.`}
        action={
          <Button asChild>
            <Link href="/">Về trang chính</Link>
          </Button>
        }
      />
    </div>
  );
}
