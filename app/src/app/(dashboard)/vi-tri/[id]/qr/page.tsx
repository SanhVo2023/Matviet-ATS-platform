import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";
import { publicEnv } from "@/types/env";
import { QrPoster } from "@/components/features/careers/QrPoster";

export const dynamic = "force-dynamic";

/**
 * Printable QR poster for a job (G12) — HR prints this and stores tape it to
 * the shop window. The QR points at the public apply page. The dashboard
 * chrome is `print:hidden`, so window.print() emits just the poster.
 */
export default async function JobQrPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "hr"]);
  const { id } = await params;
  const db = await getDb();
  const job = await db
    .select({ id: jobs.id, title: jobs.title, location: jobs.location, status: jobs.status })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!job) notFound();

  return (
    <QrPoster
      jobId={job.id}
      jobTitle={job.title}
      location={job.location}
      applyUrl={`${publicEnv.appUrl}/tuyen-dung/${job.id}`}
      jobOpen={job.status === "open"}
    />
  );
}
