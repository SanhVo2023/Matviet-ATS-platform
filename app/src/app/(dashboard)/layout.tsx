import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomTabs } from "@/components/layout/BottomTabs";
import { AgentDock } from "@/components/features/agent/AgentDock";

/**
 * Protected dashboard shell. Server-fetches the session profile,
 * redirects unauthenticated users to /dang-nhap (also enforced by middleware
 * for defence in depth), and renders the role-scoped shell: hover-expand
 * sidebar rail (desktop), topbar, and bottom tab bar (mobile).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSession();

  return (
    // h-dvh + overflow-hidden pins the shell: sidebar + topbar stay put and
    // only <main> scrolls. Print restores natural flow (QR poster page).
    <div className="flex h-dvh overflow-hidden bg-slate-50 print:h-auto print:overflow-visible">
      {/* Skip link must be the FIRST focusable element, before the nav it skips */}
      <a href="#main-content" className="skip-link">
        Bỏ qua đến nội dung
      </a>
      {/* Sidebar reserves its slim rail width itself; expansion overlays content.
          print:hidden wrappers keep the chrome out of printed pages (QR poster). */}
      <div className="contents print:hidden">
        <Sidebar role={profile.role} />
      </div>
      <div className="flex h-full min-h-0 flex-1 flex-col print:h-auto">
        <div className="contents print:hidden">
          <TopBar
            fullName={profile.full_name ?? profile.email ?? ""}
            email={profile.email ?? ""}
            role={profile.role}
          />
        </div>
        {/* pb-16 clears the fixed bottom tab bar on mobile */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto pb-16 lg:pb-0 print:overflow-visible"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <div className="contents print:hidden">
        <BottomTabs role={profile.role} />
        <AgentDock role={profile.role} />
      </div>
    </div>
  );
}
