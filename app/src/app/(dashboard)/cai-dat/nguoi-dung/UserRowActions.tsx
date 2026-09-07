"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
  Loader2,
  Copy,
  Dices,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";
import { generateTempPassword } from "@/lib/passwords";
import {
  updateUserAction,
  sendResetEmailAction,
  setUserActive,
  setUserPasswordAction,
} from "./actions";
import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];
const ROLES: UserRole[] = ["admin", "hr", "hiring_manager", "bod", "tap_doan"];

interface Props {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    departmentId: string | null;
    phone: string | null;
    isActive: boolean;
  };
  departments: Array<{ id: string; name: string }>;
  isSelf: boolean;
}

/** Per-user admin menu (ADR 0015): every common action in two clicks. */
export function UserRowActions({ user, departments, isSelf }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [pwdOpen, setPwdOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState(user.name);
  const [role, setRole] = React.useState<UserRole>(user.role);
  const [deptId, setDeptId] = React.useState(user.departmentId ?? "");
  const [phone, setPhone] = React.useState(user.phone ?? "");
  const [newPassword, setNewPassword] = React.useState("");

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Có lỗi xảy ra");
        return false;
      }
      toast.success(okMsg);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Thao tác với ${user.name}`}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden /> Sửa thông tin & vai trò
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              void run(
                () => sendResetEmailAction(user.id),
                `Đã gửi email đặt lại mật khẩu tới ${user.email}`,
              )
            }
          >
            <KeyRound className="mr-2 h-3.5 w-3.5" aria-hidden /> Gửi email đặt lại mật khẩu
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setNewPassword(generateTempPassword());
              setPwdOpen(true);
            }}
          >
            <ShieldCheck className="mr-2 h-3.5 w-3.5" aria-hidden /> Đặt mật khẩu mới (trực tiếp)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.isActive ? (
            <DropdownMenuItem
              disabled={isSelf}
              className="text-error-fg"
              onSelect={() =>
                void run(() => setUserActive(user.id, false), `Đã vô hiệu hóa ${user.name}`)
              }
            >
              <UserX className="mr-2 h-3.5 w-3.5" aria-hidden />
              {isSelf ? "Vô hiệu hóa (không thể tự khóa)" : "Vô hiệu hóa (đăng xuất ngay)"}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() =>
                void run(() => setUserActive(user.id, true), `Đã kích hoạt lại ${user.name}`)
              }
            >
              <UserCheck className="mr-2 h-3.5 w-3.5" aria-hidden /> Kích hoạt lại
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa: {user.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="eu-name">Họ tên</Label>
              <Input id="eu-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-role">Vai trò</Label>
              <select
                id="eu-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSelf}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t.userRole[r]}
                  </option>
                ))}
              </select>
              {isSelf && (
                <p className="text-xs text-slate-500">Không thể tự đổi vai trò của chính mình.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-dept">Phòng ban</Label>
              <select
                id="eu-dept"
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">— Không —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-phone">Số điện thoại</Label>
              <Input
                id="eu-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901 234 567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={busy}>
              Hủy
            </Button>
            <Button
              onClick={() =>
                void run(
                  () =>
                    updateUserAction({
                      user_id: user.id,
                      full_name: name,
                      role,
                      department_id: deptId || null,
                      phone,
                    }),
                  "Đã cập nhật người dùng",
                ).then((ok) => {
                  if (ok) setEditOpen(false);
                })
              }
              disabled={busy || name.trim().length < 2}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Đặt mật khẩu mới: {user.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Dùng khi người dùng bị khóa ngoài và email đặt lại không tới được. Mật khẩu hiển thị
              MỘT lần — sao chép và gửi trực tiếp cho {user.name}. Các phiên đăng nhập cũ sẽ bị đăng
              xuất.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="sp-password">Mật khẩu mới (tối thiểu 8 ký tự)</Label>
              <div className="flex gap-2">
                <Input
                  id="sp-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Tạo mật khẩu ngẫu nhiên"
                  onClick={() => setNewPassword(generateTempPassword())}
                >
                  <Dices className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Sao chép mật khẩu"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(newPassword)
                      .then(() => toast.success("Đã sao chép mật khẩu"))
                      .catch(() => toast.error("Không sao chép được — hãy chép thủ công"));
                  }}
                >
                  <Copy className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdOpen(false)} disabled={busy}>
              Hủy
            </Button>
            <Button
              onClick={() =>
                void run(
                  () => setUserPasswordAction({ user_id: user.id, new_password: newPassword }),
                  `Đã đặt mật khẩu mới cho ${user.name} — các phiên cũ đã đăng xuất.`,
                ).then((ok) => {
                  if (ok) setPwdOpen(false);
                })
              }
              disabled={busy || newPassword.length < 8}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Đặt mật khẩu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
