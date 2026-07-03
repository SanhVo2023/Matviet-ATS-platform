/**
 * Module registry (ADR 0012) — the single source of truth for what the app
 * can do and who sees it. The sidebar renders from this; future modules
 * (employee management) are declared here with `enabled: false` and flip on
 * when their build group ships.
 */
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
  ShieldCheck,
  FileText,
  IdCard,
  Building2,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

export type ModuleGroup = "recruiting" | "hris" | "system";

export interface AppModule {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  group: ModuleGroup;
  enabled: boolean;
}

export const MODULE_GROUP_LABELS: Record<ModuleGroup, string | null> = {
  recruiting: "Tuyển dụng",
  hris: "Nhân sự",
  system: null,
};

/** Role-scoped entries per docs/ui-ux.md §8.2. Vietnamese slugs for shareability. */
export const MODULES: AppModule[] = [
  // Landing pages (role-dependent)
  {
    key: "inbox",
    href: "/",
    label: t.nav.inbox,
    icon: Inbox,
    roles: ["hiring_manager"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "dashboard",
    href: "/",
    label: t.nav.dashboard,
    icon: LayoutDashboard,
    roles: ["admin", "hr"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "jobs",
    href: "/tin-tuyen-dung",
    label: t.nav.jobs,
    icon: Briefcase,
    roles: ["admin", "hr", "hiring_manager"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "candidates",
    href: "/ung-vien",
    label: t.nav.candidates,
    icon: Users,
    roles: ["admin", "hr", "hiring_manager"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "interviews",
    href: "/phong-van",
    label: t.nav.interviews,
    icon: Calendar,
    roles: ["admin", "hr", "hiring_manager"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "approvals",
    href: "/phe-duyet",
    label: t.nav.approvals,
    icon: CheckCircle2,
    roles: ["admin", "hr", "hiring_manager", "bod", "tap_doan"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "emails",
    href: "/email",
    label: t.nav.emails,
    icon: Mail,
    roles: ["admin", "hr"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "tests",
    href: "/cai-dat/bai-test",
    label: t.nav.tests,
    icon: ClipboardCheck,
    roles: ["admin", "hr"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "reports",
    href: "/bao-cao",
    label: t.nav.reports,
    icon: BarChart3,
    roles: ["admin", "hr", "hiring_manager"],
    group: "recruiting",
    enabled: true,
  },
  {
    key: "referrals",
    href: "/gioi-thieu",
    label: t.nav.referrals,
    icon: UserPlus,
    roles: ["admin", "hr", "hiring_manager"],
    group: "recruiting",
    enabled: false, // G11 backlog — route not built yet
  },

  // ----- Employee management (ADR 0012 — foundation reserved, build later) -----
  {
    key: "employees",
    href: "/nhan-vien",
    label: "Nhân viên",
    icon: IdCard,
    roles: ["admin", "hr"],
    group: "hris",
    enabled: false,
  },
  {
    key: "org",
    href: "/phong-ban",
    label: "Phòng ban",
    icon: Building2,
    roles: ["admin", "hr"],
    group: "hris",
    enabled: false,
  },
  {
    key: "leave",
    href: "/nghi-phep",
    label: "Nghỉ phép",
    icon: CalendarClock,
    roles: ["admin", "hr", "hiring_manager"],
    group: "hris",
    enabled: false,
  },

  // ----- System -----
  {
    key: "settings",
    href: "/cai-dat",
    label: t.nav.settings,
    icon: Settings,
    roles: ["admin"],
    group: "system",
    enabled: true,
  },
  {
    key: "system-admin",
    href: "/cai-dat/he-thong",
    label: "Hệ thống",
    icon: ShieldCheck,
    roles: ["admin"],
    group: "system",
    enabled: true,
  },
  {
    key: "audit",
    href: "/nhat-ky",
    label: t.nav.audit,
    icon: FileText,
    roles: ["admin"],
    group: "system",
    enabled: false, // G11 backlog — route not built yet
  },
];

export function modulesForRole(role: UserRole): AppModule[] {
  return MODULES.filter((m) => m.enabled && m.roles.includes(role));
}
