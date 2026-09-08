import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listCandidates } from "@/server/candidates/repository";
import { listJobs } from "@/server/jobs/repository";
import { CandidatesListClient } from "@/components/features/candidates/CandidatesListClient";
import { PageContainer } from "@/components/primitives/PageContainer";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.nav.candidates };
export const dynamic = "force-dynamic";

export default async function CandidatesListPage() {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);

  // Hiring managers only see candidates on their assigned jobs (ADR 0011)
  const managerScope = profile.role === "hiring_manager" ? profile.id : null;
  const [candidates, jobs] = await Promise.all([
    listCandidates({ for_manager_user_id: managerScope }),
    listJobs(),
  ]);

  return (
    <PageContainer size="default">
      <CandidatesListClient
        initialCandidates={candidates}
        jobs={jobs.map((j) => ({ id: j.id, title: j.title, status: j.status }))}
      />
    </PageContainer>
  );
}
