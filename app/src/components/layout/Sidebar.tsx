"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Logo } from "./Logo";
import { modulesForRole, MODULE_GROUP_LABELS, type ModuleGroup } from "@/lib/modules";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

interface SidebarProps {
  role: UserRole;
}

const GROUP_ORDER: ModuleGroup[] = ["recruiting", "hris", "system"];

/** Slim icon rail / expanded overlay widths (design-language §6). */
const RAIL_WIDTH = 72;
const EXPANDED_WIDTH = 256;

const SPRING = { type: "spring", stiffness: 300, damping: 34 } as const;

/**
 * Desktop sidebar — hover-expand rail (design-language §6).
 * Collapsed: 72px icon-only navy rail. On hover or keyboard focus it expands
 * to 256px as an OVERLAY (absolutely positioned inside a fixed-width spacer),
 * so the main content never shifts. Gold left-edge bar marks the active item
 * via a shared-layout `motion.span`.
 */
export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = React.useState(false);

  const items = modulesForRole(role);
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    label: MODULE_GROUP_LABELS[g],
    items: items.filter((m) => m.group === g),
  })).filter((g) => g.items.length > 0);
  const showHeaders = groups.length > 1;

  const widthTransition = reduceMotion ? { duration: 0 } : SPRING;
  const labelTransition = (index: number) =>
    reduceMotion ? { duration: 0 } : { duration: 0.18, delay: expanded ? 0.03 + index * 0.015 : 0 };

  let itemIndex = 0;

  return (
    // Spacer keeps the layout at rail width — the expansion overlays content.
    // h-full (not h-screen): the dashboard shell is a fixed-height flex row,
    // so the rail stays pinned while <main> scrolls.
    <div className="relative hidden h-full w-[72px] shrink-0 lg:block">
      <motion.aside
        aria-label="Điều hướng chính"
        initial={false}
        animate={{ width: expanded ? EXPANDED_WIDTH : RAIL_WIDTH }}
        transition={widthTransition}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setExpanded(false);
        }}
        className={cn(
          "absolute inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-brand-900 text-slate-100",
          expanded && "shadow-xl",
        )}
        style={{ width: RAIL_WIDTH }}
      >
        {/* Brand: gold monogram always visible; wordmark fades in on expand */}
        <div className="flex h-16 shrink-0 items-center pl-[18px]">
          <Link
            href="/"
            aria-label={t.app.name}
            className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-extrabold tracking-tight text-accent-400"
              aria-hidden
            >
              MV
            </span>
            <motion.span
              initial={false}
              animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -8 }}
              transition={labelTransition(0)}
              className="ml-3 flex items-center whitespace-nowrap"
              aria-hidden={!expanded}
            >
              <Logo variant="wordmark-yellow" width={112} height={32} priority />
            </motion.span>
          </Link>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          {groups.map(({ group, label, items: groupItems }) => (
            <div key={group} className="mb-4 last:mb-0">
              {showHeaders && label && (
                <div className="relative flex h-6 items-center px-2">
                  <motion.p
                    initial={false}
                    animate={{ opacity: expanded ? 1 : 0 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
                    className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {label}
                  </motion.p>
                  {/* Collapsed: hairline divider in place of the header text */}
                  <motion.span
                    initial={false}
                    animate={{ opacity: expanded ? 0 : 1 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
                    className="absolute left-1 top-1/2 h-px w-8 bg-white/10"
                    aria-hidden
                  />
                </div>
              )}
              <ul className="space-y-1">
                {groupItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  const index = itemIndex++;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        title={expanded ? undefined : item.label}
                        className={cn(
                          "relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60",
                          active
                            ? "bg-white/10 text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            transition={widthTransition}
                            className="absolute -left-4 top-[calc(50%-10px)] h-5 w-1 rounded-r-full bg-accent-400"
                            aria-hidden
                          />
                        )}
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        {/* Kept in the a11y tree even when visually collapsed */}
                        <motion.span
                          initial={false}
                          animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -8 }}
                          transition={labelTransition(index)}
                          className="whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </motion.aside>
    </div>
  );
}
