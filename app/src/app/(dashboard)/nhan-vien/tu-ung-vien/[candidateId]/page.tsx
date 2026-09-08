import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getEmployeeBySourceCandidate } from "@/server/employees/repository";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Button } from "@/components/ui/button";
import { ConvertCandidateButton } from "@/components/features/employees/ConvertCandidateButton";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: t.employee.title };

/**
 * The ATS ↔ HRM seam, as a URL: /nhan-vien/tu-ung-vien/<candidateId> resolves
 * to the employee created from that candidate (same person_id, ADR 0012). The
 * ladder links here after a hire; if the conversion never ran (hired before
 * H0), HR can create the record in one tap instead of hitting a dead end.
 */
export default async function FromCandidatePage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  await requireRole(["admin", "hr"]);
  const { candidateId } = await params;

  const employee = await getEmployeeBySourceCandidate(candidateId);
  if (employee) redirect(`/nhan-vien/${employee.id}`);

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <EmptyState
        illustration="people"
        title="Chưa có hồ sơ nhân viên cho ứng viên này"
        description="Hồ sơ nhân viên được tạo tự động khi xác nhận tuyển. Nếu ứng viên đã được tuyển trước đó, bấm để tạo ngay — cùng một hồ sơ cá nhân, không cần nhập lại."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ConvertCandidateButton candidateId={candidateId} />
            <Button asChild variant="outline">
              <Link href={`/ung-vien/${candidateId}`}>{t.action.back}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
