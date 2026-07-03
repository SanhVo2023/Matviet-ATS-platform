"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutDashboard, Users, Calendar, CheckCircle2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import type { Database } from "@/types/db";
import type { LucideIcon } from "lucide-react";

type UserRole = Database["public"]["Enums"]["user_role"];

interface Tab {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { key: "overview", href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { key: "candidates", href: "/ung-vien", label: "Ứng viên", icon: Users },
  { key: "interviews", href: "/phong-van", label: "Phỏng vấn", icon: Calendar },
  { key: "approvals", href: "/phe-duyet", label: "Phê duyệt", icon: CheckCircle2 },
];

/**
 * Mobile bottom tab bar (< lg) — design-language §6. Four primary
 * destinations + a "Menu" tab that opens the full MobileNav drawer
 * (controlled, its own trigger hidden). A gold dot slides between active
 * tabs via shared layout. Safe-area padded for notched devices.
 */
export function BottomTabs({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const dotTransition = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 400, damping: 32 } as const);

  return (
    <>
      <nav
        aria-label="Điều hướng nhanh"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(11,20,48,0.08)] lg:hidden"
      >
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
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
                  className={cn("h-5 w-5", active ? "text-accent-500" : "text-slate-400")}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11px]",
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
            <span className="text-[11px] font-medium text-slate-500">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full drawer for everything not on the tab bar; trigger hidden. */}
      <MobileNav role={role} open={menuOpen} onOpenChange={setMenuOpen} showTrigger={false} />
    </>
  );
}
