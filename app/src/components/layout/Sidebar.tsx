"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
        {groups.map(({ group, label, items: groupItems }) => (
          <div key={group} className="mb-4 last:mb-0">
            {showHeaders && label && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {label}
              </p>
            )}
            <ul className="space-y-1">
              {groupItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.key}>
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
