"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckCircle2,
  CalendarClock,
  IdCard,
  Megaphone,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import { modulesForRole } from "@/lib/modules";
import type { Database } from "@/types/db";
import type { LucideIcon } from "lucide-react";

type UserRole = Database["public"]["Enums"]["user_role"];

interface Tab {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Every destination that can appear on the bar, keyed by route. */
const TAB_CATALOG: Record<string, Tab> = {
  "/": { key: "overview", href: "/", label: "Tổng quan", icon: LayoutDashboard },
  "/ung-vien": { key: "candidates", href: "/ung-vien", label: "Ứng viên", icon: Users },
  "/phong-van": { key: "interviews", href: "/phong-van", label: "Phỏng vấn", icon: Calendar },
  "/phe-duyet": { key: "approvals", href: "/phe-duyet", label: "Phê duyệt", icon: CheckCircle2 },
  "/nghi-phep": { key: "leave", href: "/nghi-phep", label: "Nghỉ phép", icon: CalendarClock },
  "/nhan-vien": { key: "employees", href: "/nhan-vien", label: "Nhân viên", icon: IdCard },
  "/thong-bao": { key: "comms", href: "/thong-bao", label: "Thông báo", icon: Megaphone },
};

/**
 * What each role reaches for on a phone, in priority order. Capped at MAX_TABS
 * (+ "Thêm"), so the bar never exceeds five cells. A store manager's floor
 * tasks are leave approvals and the shortlist — those go in the thumb zone;
 * HR is laptop-first and keeps the recruiting set; execs approve and read.
 */
const ROLE_PRIORITY: Record<UserRole, string[]> = {
  admin: ["/", "/ung-vien", "/phong-van", "/phe-duyet", "/nhan-vien"],
  hr: ["/", "/ung-vien", "/phong-van", "/phe-duyet", "/nhan-vien"],
  hiring_manager: ["/", "/ung-vien", "/nghi-phep", "/phe-duyet", "/phong-van"],
  bod: ["/", "/phe-duyet", "/thong-bao"],
  tap_doan: ["/", "/phe-duyet", "/thong-bao"],
};
const MAX_TABS = 4;

/**
 * Mobile bottom tab bar (< md) — design-language §6. Role-prioritized
 * destinations the role can actually reach (modulesForRole) + a "Thêm" tab
 * that opens the full MobileNav drawer. A gold dot slides between active
 * tabs. Safe-area padded for notched devices.
 */
export function BottomTabs({
  role,
  fullName,
  email,
}: {
  role: UserRole;
  fullName: string;
  email: string;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // "/" is every role's home; otherwise keep only routes the role has an
  // enabled module for, in the role's priority order.
  const allowedHrefs = new Set(modulesForRole(role).map((m) => m.href));
  const tabs = (ROLE_PRIORITY[role] ?? ["/"])
    .filter((href) => href === "/" || allowedHrefs.has(href))
    .slice(0, MAX_TABS)
    .map((href) => TAB_CATALOG[href])
    .filter((t): t is Tab => Boolean(t));
  const gridCols = tabs.length + 1; // + the "Thêm" button

  const dotTransition = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 400, damping: 32 } as const);

  return (
    <>
      <nav
        aria-label="Điều hướng nhanh"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(11,20,48,0.08)] md:hidden"
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              pathname === tab.href || (tab.href !== "/" && pathname.startsWith(`${tab.href}/`));
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-14 flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
              >
                {active && (
                  <motion.span
                    layoutId="bottomtab-active"
                    transition={dotTransition}
                    className="absolute top-1 h-1 w-6 rounded-full bg-accent-400"
                    aria-hidden
                  />
                )}
                <Icon
                  className={cn("h-5 w-5", active ? "text-accent-600" : "text-slate-500")}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-2xs",
                    active ? "font-semibold text-brand-900" : "font-medium text-slate-500",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu điều hướng"
            className="flex h-14 flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
          >
            <Menu className="h-5 w-5 text-slate-400" aria-hidden />
            <span className="text-2xs font-medium text-slate-500">Thêm</span>
          </button>
        </div>
      </nav>

      {/* Full drawer for everything not on the tab bar; trigger hidden. */}
      <MobileNav
        role={role}
        fullName={fullName}
        email={email}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        showTrigger={false}
      />
    </>
  );
}
