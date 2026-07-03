"use client";

import { Bell, Search, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { t } from "@/lib/i18n";
import { initials } from "@/lib/vi-format";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

interface TopBarProps {
  fullName: string;
  email: string;
  role: UserRole;
}

/**
 * Top bar — white raised surface. Mobile navigation lives in BottomTabs
 * (its "Menu" tab opens the drawer), so there is no hamburger here.
 */
export function TopBar({ fullName, email, role }: TopBarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/dang-nhap");
    router.refresh();
  };

  return (
    <header
      className="flex h-16 items-center gap-4 border-b border-slate-200 bg-surface-raised px-4 shadow-sm sm:px-6"
      role="banner"
    >
      <div className="flex flex-1 items-center gap-3">
        <div className="relative hidden w-full max-w-md md:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder={t.action.search}
            aria-label={t.action.search}
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            disabled
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Thông báo"
        disabled
        className="hidden md:inline-flex"
      >
        <Bell className="h-4 w-4" aria-hidden />
      </Button>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-brand-900">{fullName}</p>
          <p className="text-xs text-slate-500">{t.userRole[role]}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-accent-400"
          aria-label={`Avatar ${fullName}`}
          title={email}
        >
          {initials(fullName || email)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label={t.action.signOut}
          title={t.action.signOut}
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </header>
  );
}
