"use client";

import * as React from "react";
import { LogOut, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

interface Props {
  fullName: string;
  email: string;
  role: UserRole;
}

/**
 * Account menu — the navy/gold avatar button that used to live in the TopBar,
 * now the SideNav footer (the top bar was pure chrome and got removed —
 * Sanh 2026-07-07). Đổi mật khẩu qua email + đăng xuất.
 */
export function AccountMenu({ fullName, email, role }: Props) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
          aria-label={`Tài khoản: ${fullName}`}
          title={email}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-400 text-sm font-semibold text-brand-900">
            {initials(fullName || email)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-50">{fullName}</span>
            <span className="block truncate text-xs text-slate-400">{t.userRole[role]}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-64">
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
  );
}
