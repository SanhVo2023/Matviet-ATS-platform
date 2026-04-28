import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import type { Tables } from "@/types/db";
import { InviteForm } from "./InviteForm";

export const metadata: Metadata = { title: "Quản lý người dùng" };

type ProfileRow = Tables<"profiles">;
type DepartmentRow = Pick<Tables<"departments">, "id" | "name">;

export default async function UsersAdminPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const profilesRes = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  const departmentsRes = await supabase.from("departments").select("id, name").order("name");

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const departments = (departmentsRes.data ?? []) as DepartmentRow[];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-slate-500">Mời thành viên mới và phân quyền.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Mời thành viên mới</CardTitle>
          <CardDescription>
            Hệ thống sẽ gửi email với link đặt mật khẩu. Sau khi xác nhận, người dùng có thể đăng
            nhập.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm departments={departments ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thành viên hiện có ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-2 py-2 font-medium">Họ tên</th>
                    <th className="px-2 py-2 font-medium">Vai trò</th>
                    <th className="px-2 py-2 font-medium">Phòng ban</th>
                    <th className="px-2 py-2 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => {
                    const dept = departments.find((d) => d.id === p.department_id);
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-2 py-2 font-medium text-slate-700">
                          {p.full_name ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-slate-600">{t.userRole[p.role]}</td>
                        <td className="px-2 py-2 text-slate-600">{dept?.name ?? "—"}</td>
                        <td className="px-2 py-2">
                          {p.is_active ? (
                            <span className="inline-flex rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-fg">
                              Đang hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              Vô hiệu
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có thành viên nào.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
