import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listAnnouncements, listDocuments } from "@/server/comms/repository";
import { CommsClient } from "@/components/features/comms/CommsClient";
import { PageContainer } from "@/components/primitives/PageContainer";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.comms.title };

export default async function CommsPage() {
  const profile = await requireRole(["admin", "hr", "hiring_manager", "bod", "tap_doan"]);
  const canManage = profile.role === "admin" || profile.role === "hr";

  const [announcements, documents] = await Promise.all([listAnnouncements(), listDocuments()]);

  return (
    <PageContainer size="detail">
      <CommsClient announcements={announcements} documents={documents} canManage={canManage} />
    </PageContainer>
  );
}
