"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";
import { inviteUser } from "./actions";

interface Department {
  id: string;
  name: string;
}

export function InviteForm({ departments }: { departments: Department[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await inviteUser(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t.success.invited);
      // Reset by relying on the form's defaultValues + key reset
      const form = document.getElementById("invite-form") as HTMLFormElement | null;
      form?.reset();
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
          <select
            id="role"
            name="role"
            required
            disabled={pending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="hr">{t.userRole.hr}</option>
            <option value="hiring_manager">{t.userRole.hiring_manager}</option>
            <option value="admin">{t.userRole.admin}</option>
            <option value="bod">{t.userRole.bod}</option>
            <option value="tap_doan">{t.userRole.tap_doan}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="department_id">{t.jobForm.department}</Label>
          <select
            id="department_id"
            name="department_id"
            disabled={pending}
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">— Không thuộc phòng ban —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-error-bg/40 px-3 py-2 text-sm text-error-fg">
          {error}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? "Đang gửi..." : "Gửi lời mời"}
      </Button>
    </form>
  );
}
