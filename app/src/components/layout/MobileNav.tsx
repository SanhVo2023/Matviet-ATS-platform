"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Logo } from "./Logo";
import { modulesForRole, MODULE_GROUP_LABELS, type ModuleGroup } from "@/lib/modules";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

const GROUP_ORDER: ModuleGroup[] = ["recruiting", "hris", "system"];

/**
 * Mobile drawer navigation (< lg). Same module registry as the desktop
 * sidebar; radix Dialog provides the focus trap, Esc handling, and aria
 * wiring. Closes on navigation.
 */
export function MobileNav({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = modulesForRole(role);
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    label: MODULE_GROUP_LABELS[g],
    items: items.filter((m) => m.group === g),
  })).filter((g) => g.items.length > 0);
  const showHeaders = groups.length > 1;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-brand-navy text-slate-100 shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Điều hướng chính</Dialog.Title>
          <div className="flex h-16 items-center justify-between px-5">
            <Logo variant="on-dark" width={120} height={36} />
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4" aria-label={t.app.name}>
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
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
