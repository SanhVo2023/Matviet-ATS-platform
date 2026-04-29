"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  Users,
  Calendar,
  CheckCircle2,
  Mail,
  ClipboardCheck,
  BarChart3,
  UserPlus,
  Settings,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Logo } from "./Logo";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

/** Role-scoped sidebar entries per docs/ui-ux.md §8.2.
 * Vietnamese URL slugs match the Vietnamese UI for shareability with chị Hương. */
const NAV_ITEMS: NavItem[] = [
  // Manager landing — only visible to hiring_manager
  { href: "/", label: t.nav.inbox, icon: Inbox, roles: ["hiring_manager"] },
  // HR/Admin landing — only visible to admin/hr
  { href: "/", label: t.nav.dashboard, icon: LayoutDashboard, roles: ["admin", "hr"] },

  {
    href: "/tin-tuyen-dung",
    label: t.nav.jobs,
    icon: Briefcase,
    roles: ["admin", "hr", "hiring_manager"],
  },
  {
    href: "/ung-vien",
    label: t.nav.candidates,
    icon: Users,
    roles: ["admin", "hr", "hiring_manager"],
  },
  {
    href: "/phong-van",
    label: t.nav.interviews,
    icon: Calendar,
    roles: ["admin", "hr", "hiring_manager"],
  },
  {
    href: "/phe-duyet",
    label: t.nav.approvals,
    icon: CheckCircle2,
    roles: ["admin", "hr", "hiring_manager", "bod", "tap_doan"],
  },
  { href: "/email", label: t.nav.emails, icon: Mail, roles: ["admin", "hr"] },
  { href: "/cai-dat/bai-test", label: t.nav.tests, icon: ClipboardCheck, roles: ["admin", "hr"] },
  {
    href: "/bao-cao",
    label: t.nav.reports,
    icon: BarChart3,
    roles: ["admin", "hr", "hiring_manager"],
  },
  {
    href: "/gioi-thieu",
    label: t.nav.referrals,
    icon: UserPlus,
    roles: ["admin", "hr", "hiring_manager"],
  },
  { href: "/cai-dat", label: t.nav.settings, icon: Settings, roles: ["admin"] },
  { href: "/nhat-ky", label: t.nav.audit, icon: FileText, roles: ["admin"] },
];

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside
      className="hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-brand-navy text-slate-100 lg:flex"
      aria-label="Điều hướng chính"
    >
      <div className="flex h-16 items-center px-6">
        <Link href="/" aria-label={t.app.name}>
          <Logo variant="on-dark" width={140} height={42} priority />
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
