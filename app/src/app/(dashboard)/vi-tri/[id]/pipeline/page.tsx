import { redirect } from "next/navigation";

/**
 * The per-job kanban merged INTO the job workspace (ADR 0016) — this route
 * only survives so old bookmarks and deep links keep working.
 */
export default async function JobPipelineRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/vi-tri/${id}`);
}
