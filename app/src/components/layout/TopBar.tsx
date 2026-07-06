"use client";

import * as React from "react";
import { Search, LogOut, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { requestMyPasswordResetAction } from "@/app/(dashboard)/cai-dat/nguoi-dung/actions";
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
 * Top bar — white raised surface. The avatar opens the account menu
 * (đổi mật khẩu qua email, đăng xuất). Mobile navigation lives in BottomTabs.
 */
export function TopBar({ fullName, email, role }: TopBarProps) {
  const router = useRouter();
  const [resetBusy, setResetBusy] = React.useState(false);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/dang-nhap");
    router.refresh();
  };

  const handlePasswordReset = async () => {
    setResetBusy(true);
    try {
      const res = await requestMyPasswordResetAction();
      if (res.ok) {
        toast.success(`Đã gửi liên kết đổi mật khẩu tới ${email} (hiệu lực 1 giờ)`);
      } else {
        toast.error(res.error ?? "Không gửi được email");
      }
    } finally {
      setResetBusy(false);
    }
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

      <NotificationBell />

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-brand-900">{fullName}</p>
          <p className="text-xs text-slate-500">{t.userRole[role]}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-accent-400 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label={`Tài khoản: ${fullName}`}
              title={email}
            >
              {initials(fullName || email)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold text-brand-900">{fullName}</p>
              <p className="text-xs font-normal text-slate-500">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={resetBusy} onSelect={() => void handlePasswordReset()}>
              {resetBusy ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <KeyRound className="mr-2 h-3.5 w-3.5" aria-hidden />
              )}
              Đổi mật khẩu (gửi link qua email)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleSignOut()}>
              <LogOut className="mr-2 h-3.5 w-3.5" aria-hidden />
              {t.action.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
