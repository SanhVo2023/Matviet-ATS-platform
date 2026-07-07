"use client";

import * as React from "react";
import { LogOut, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TopNav } from "@astryxdesign/core/TopNav";
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
 * Top bar — Astryx TopNav (ADR 0016). Brand identity lives in the SideNav
 * heading; this bar carries the notification bell and the account menu
 * (đổi mật khẩu qua email, đăng xuất). The old always-disabled search box
 * was dropped (dead UI — command palette is a future enhancement).
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
    <TopNav
      label="Thanh công cụ"
      endContent={
        <div className="flex items-center gap-3">
          <NotificationBell />
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
      }
    />
  );
}
