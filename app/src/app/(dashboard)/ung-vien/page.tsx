import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listCandidates } from "@/server/candidates/repository";
import { listJobs } from "@/server/jobs/repository";
import { CandidatesListClient } from "@/components/features/candidates/CandidatesListClient";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.nav.candidates };
export const dynamic = "force-dynamic";

export default async function CandidatesListPage() {
  await requireRole(["admin", "hr", "hiring_manager"]);

  const [candidates, jobs] = await Promise.all([listCandidates(), listJobs()]);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <CandidatesListClient
        initialCandidates={candidates}
        jobs={jobs.map((j) => ({ id: j.id, title: j.title, status: j.status }))}
      />
    </div>
  );
}
