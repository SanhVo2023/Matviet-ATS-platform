import { redirect } from "next/navigation";

/**
 * The Vị trí LIST merged into the dashboard control center (Sanh 2026-07-07)
 * — positions render on "/" with candidate tallies. This route survives for
 * old bookmarks. Workspace (/vi-tri/[id]) and create (/vi-tri/moi) stay.
 */
export const dynamic = "force-dynamic";

export default function JobsListRedirect() {
  redirect("/");
}
