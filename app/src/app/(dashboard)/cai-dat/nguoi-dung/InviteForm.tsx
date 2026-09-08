"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { t } from "@/lib/i18n";
import { inviteUser } from "./actions";

interface Department {
  id: string;
  name: string;
}

const ROLE_OPTIONS = [
  { value: "hr", label: t.userRole.hr },
  { value: "hiring_manager", label: t.userRole.hiring_manager },
  { value: "admin", label: t.userRole.admin },
  { value: "bod", label: t.userRole.bod },
  { value: "tap_doan", label: t.userRole.tap_doan },
];

export function InviteForm({ departments }: { departments: Department[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [role, setRole] = useState("hr");
  const [departmentId, setDepartmentId] = useState("");

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setTempPassword(null);
    startTransition(async () => {
      const result = await inviteUser(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTempPassword(result.tempPassword);
      toast.success(
        result.emailSent
          ? "Đã tạo tài khoản và gửi email chào mừng."
          : "Đã tạo tài khoản — email chưa gửi được, hãy đưa mật khẩu tạm trực tiếp.",
      );
      // Reset by relying on the form's defaultValues + key reset
      const form = document.getElementById("invite-form") as HTMLFormElement | null;
      form?.reset();
      setRole("hr");
      setDepartmentId("");
    });
  };

  return (
    <form id="invite-form" action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">{t.candidate.fullName}</Label>
          <Input id="full_name" name="full_name" required minLength={2} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t.candidate.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder={t.auth.emailPlaceholder}
            disabled={pending}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Vai trò</Label>
          <SimpleSelect
            id="role"
            name="role"
            value={role}
            onValueChange={setRole}
            options={ROLE_OPTIONS}
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department_id">{t.jobForm.department}</Label>
          <SimpleSelect
            id="department_id"
            name="department_id"
            value={departmentId}
            onValueChange={setDepartmentId}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            emptyLabel="— Không thuộc phòng ban —"
            disabled={pending}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-error-bg/40 px-3 py-2 text-sm text-error-fg">
          {error}
        </div>
      )}

      {tempPassword && (
        <div
          role="status"
          className="rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-sm"
        >
          <p className="font-medium text-brand-900">Mật khẩu tạm (chỉ hiển thị một lần):</p>
          <code className="mt-1 block select-all rounded border border-accent-200 bg-white px-2 py-1 font-mono text-base text-brand-900">
            {tempPassword}
          </code>
          <p className="mt-1 text-xs text-slate-500">
            Gửi cho thành viên qua kênh an toàn (Zalo/Teams trực tiếp), không gửi email thường.
          </p>
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? "Đang tạo..." : "Tạo tài khoản"}
      </Button>
    </form>
  );
}
