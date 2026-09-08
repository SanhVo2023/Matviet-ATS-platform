import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listAnnouncements, listDocuments } from "@/server/comms/repository";
import { CommsClient } from "@/components/features/comms/CommsClient";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.comms.title };

export default async function CommsPage() {
  const profile = await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);
  const canManage = profile.role === "admin" || profile.role === "hr";

  const [announcements, documents] = await Promise.all([listAnnouncements(), listDocuments()]);

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <CommsClient announcements={announcements} documents={documents} canManage={canManage} />
    </div>
  );
}
