"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { modulesForRole, MODULE_GROUP_LABELS, type ModuleGroup } from "@/lib/modules";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

interface SidebarProps {
  role: UserRole;
  fullName: string;
  email: string;
}

const GROUP_ORDER: ModuleGroup[] = ["recruiting", "hris", "system"];

/**
 * Desktop sidebar — Astryx SideNav as the Mắt Việt navy rail, restored to the
 * HOVER AUTO-COLLAPSE behavior (Sanh 2026-07-07): collapsed icon rail by
 * default; hovering (or keyboard focus) expands it as an OVERLAY — the
 * `.mv-side-rail` wrapper keeps the layout at rail width so content never
 * shifts. The footer carries the notification bell + account menu (the old
 * TopBar was pure chrome and got removed).
 */
export function Sidebar({ role, fullName, email }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(true);
  // Grace period before collapsing — brushing past the rail shouldn't flicker it.
  const collapseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const expand = React.useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = null;
    setCollapsed(false);
  }, []);
  const collapseSoon = React.useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setCollapsed(true), 200);
  }, []);
  React.useEffect(
    () => () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    },
    [],
  );

  const items = modulesForRole(role);
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    label: MODULE_GROUP_LABELS[g],
    items: items.filter((m) => m.group === g),
  })).filter((g) => g.items.length > 0);
  const showHeaders = groups.length > 1;

  return (
    // hidden lg:block — mobile navigation is BottomTabs; the rail would
    // overlay content on phones otherwise.
    <div
      className={cn("mv-side-rail hidden h-full lg:block", !collapsed && "mv-side-rail-expanded")}
      onMouseEnter={expand}
      onMouseLeave={collapseSoon}
      onFocusCapture={expand}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) collapseSoon();
      }}
    >
      <SideNav
        header={
          <SideNavHeading
            heading={t.app.name}
            headingHref="/"
            icon={
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-extrabold tracking-tight text-accent-400"
                aria-hidden
              >
                MV
              </span>
            }
          />
        }
        collapsible={{ isCollapsed: collapsed, onCollapsedChange: setCollapsed, hasButton: false }}
        footer={
          <div
            className={cn(
              "flex flex-col gap-1 border-t border-white/10 pb-1 pt-2",
              collapsed ? "items-center px-0" : "px-1",
            )}
          >
            <NotificationBell expanded={!collapsed} />
            <AccountMenu fullName={fullName} email={email} role={role} expanded={!collapsed} />
          </div>
        }
      >
        {groups.map(({ group, label, items: groupItems }) => (
          <SideNavSection key={group} title={label ?? ""} isHeaderHidden={!showHeaders || !label}>
            {groupItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              return (
                <SideNavItem
                  key={item.key}
                  as={Link}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isSelected={active}
                />
              );
            })}
          </SideNavSection>
        ))}
      </SideNav>
    </div>
  );
}
