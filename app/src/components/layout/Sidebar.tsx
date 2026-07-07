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

  const items = modulesForRole(role);
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    label: MODULE_GROUP_LABELS[g],
    items: items.filter((m) => m.group === g),
  })).filter((g) => g.items.length > 0);
  const showHeaders = groups.length > 1;

  return (
    <div
      className={cn("mv-side-rail h-full", !collapsed && "mv-side-rail-expanded")}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      onFocusCapture={() => setCollapsed(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCollapsed(true);
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
          <div className="flex flex-col gap-1 px-1 pb-1">
            <NotificationBell expanded={!collapsed} />
            <AccountMenu fullName={fullName} email={email} role={role} />
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
