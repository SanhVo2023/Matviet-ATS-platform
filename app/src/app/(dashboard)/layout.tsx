import { AppShell } from "@astryxdesign/core/AppShell";
import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomTabs } from "@/components/layout/BottomTabs";
import { AgentDock } from "@/components/features/agent/AgentDock";

/**
 * Protected dashboard shell — Astryx AppShell (ADR 0016). Server-fetches the
 * session profile, redirects unauthenticated users to /dang-nhap (also
 * enforced by middleware), and renders the role-scoped shell: navy SideNav
 * rail + TopNav, with BottomTabs on mobile.
 *
 * height="auto" (not "fill"): nav pins via sticky positioning while the BODY
 * scrolls naturally — same pinned-chrome UX, but printing (QR poster) keeps
 * natural document flow instead of a clipped 100dvh scroll container.
 * mobileNav={false}: mobile navigation is BottomTabs, not a drawer.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSession();

  return (
    <AppShell
      height="auto"
      variant="elevated"
      contentPadding={0}
      mobileNav={false}
      sideNav={
        <div className="contents print:hidden">
          <Sidebar role={profile.role} />
        </div>
      }
      topNav={
        <div className="contents print:hidden">
          <TopBar
            fullName={profile.full_name ?? profile.email ?? ""}
            email={profile.email ?? ""}
            role={profile.role}
          />
        </div>
      }
    >
      {/* pb-16 clears the fixed bottom tab bar on mobile */}
      <div className="pb-16 lg:pb-0">{children}</div>
      <div className="contents print:hidden">
        <BottomTabs role={profile.role} />
        <AgentDock role={profile.role} />
      </div>
    </AppShell>
  );
}
