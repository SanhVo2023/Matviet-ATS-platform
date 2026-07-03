import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomTabs } from "@/components/layout/BottomTabs";

/**
 * Protected dashboard shell. Server-fetches the session profile,
 * redirects unauthenticated users to /dang-nhap (also enforced by middleware
 * for defence in depth), and renders the role-scoped shell: hover-expand
 * sidebar rail (desktop), topbar, and bottom tab bar (mobile).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Skip link must be the FIRST focusable element, before the nav it skips */}
      <a href="#main-content" className="skip-link">
        Bỏ qua đến nội dung
      </a>
      {/* Sidebar reserves its slim rail width itself; expansion overlays content */}
      <Sidebar role={profile.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          fullName={profile.full_name ?? profile.email ?? ""}
          email={profile.email ?? ""}
          role={profile.role}
        />
        {/* pb-16 clears the fixed bottom tab bar on mobile */}
        <main id="main-content" className="flex-1 overflow-y-auto pb-16 lg:pb-0" tabIndex={-1}>
          {children}
        </main>
      </div>
      <BottomTabs role={profile.role} />
    </div>
  );
}
