import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getCandidate,
  getCvFile,
  getStageHistory,
  signCvUrl,
  lookupProfileNames,
} from "@/server/candidates/repository";
import { getJob } from "@/server/jobs/repository";
import { getLatestScreening, getQueueStatus } from "@/server/scoring/repository";
import { CandidateProfile } from "@/components/features/candidates/CandidateProfile";
import { CandidateTabs } from "@/components/features/candidates/CandidateTabs";
import { CandidateTimeline } from "@/components/features/candidates/CandidateTimeline";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const candidate = await getCandidate(id);
  return { title: candidate ? `${candidate.full_name} · Ứng viên` : "Ứng viên" };
}

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["admin", "hr", "hiring_manager"]);
  const { id } = await params;

  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  const [job, cvFile, history, latestScreening, queueStatus] = await Promise.all([
    getJob(candidate.job_id),
    candidate.cv_file_id ? getCvFile(candidate.cv_file_id) : Promise.resolve(null),
    getStageHistory(candidate.id),
    getLatestScreening(candidate.id),
    getQueueStatus(candidate.id),
  ]);

  const signedUrl = cvFile ? await signCvUrl(cvFile.storage_path) : null;

  // Resolve actor names for the timeline (only the unique IDs)
  const actorIds = Array.from(
    new Set(history.map((h) => h.actor_user_id).filter((x): x is string => !!x)),
  );
  const actorNames = await lookupProfileNames(actorIds);

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left rail */}
        <div className="lg:col-span-3">
          <CandidateProfile
            candidate={candidate}
            jobTitle={job?.title ?? null}
            jobId={candidate.job_id}
          />
        </div>

        {/* Center column */}
        <div className="lg:col-span-6">
          <CandidateTabs
            candidate={candidate}
            job={job}
            cv={
              cvFile
                ? {
                    signedUrl,
                    mime: cvFile.mime,
                    originalName: cvFile.original_name,
                  }
                : undefined
            }
            latestScreening={latestScreening}
            queueStatus={queueStatus}
            isAdmin={profile.role === "admin"}
          />
        </div>

        {/* Right rail */}
        <div className="lg:col-span-3">
          <CandidateTimeline history={history} actorNames={actorNames} />
        </div>
      </div>
    </div>
  );
}
