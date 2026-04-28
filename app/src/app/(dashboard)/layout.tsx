import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

/**
 * Protected dashboard shell. Server-fetches the session profile,
 * redirects unauthenticated users to /dang-nhap (also enforced by middleware
 * for defence in depth), and renders the role-scoped sidebar + topbar.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={profile.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          fullName={profile.full_name ?? profile.email ?? ""}
          email={profile.email ?? ""}
          role={profile.role}
        />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <a href="#main-content" className="skip-link">
            Bỏ qua đến nội dung
          </a>
          {children}
        </main>
      </div>
    </div>
  );
}
