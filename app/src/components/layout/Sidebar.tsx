"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { t } from "@/lib/i18n";
import { modulesForRole, MODULE_GROUP_LABELS, type ModuleGroup } from "@/lib/modules";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

interface SidebarProps {
  role: UserRole;
}

const GROUP_ORDER: ModuleGroup[] = ["recruiting", "hris", "system"];

/**
 * Desktop sidebar — Astryx SideNav (ADR 0016) skinned as the Mắt Việt navy
 * rail via the theme's `sidenav` component override (brand-900 surface, gold
 * selected marks). Renders from the module registry; collapsible via the
 * built-in toggle instead of the old hover-expand overlay.
 */
export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const items = modulesForRole(role);
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    label: MODULE_GROUP_LABELS[g],
    items: items.filter((m) => m.group === g),
  })).filter((g) => g.items.length > 0);
  const showHeaders = groups.length > 1;

  return (
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
      collapsible
    >
      {groups.map(({ group, label, items: groupItems }) => (
        <SideNavSection key={group} title={label ?? ""} isHeaderHidden={!showHeaders || !label}>
          {groupItems.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
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
  );
}
