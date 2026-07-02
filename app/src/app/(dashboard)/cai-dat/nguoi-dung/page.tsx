import type { Metadata } from "next";
import { desc, asc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { users, departments } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { InviteForm } from "./InviteForm";

export const metadata: Metadata = { title: "Quản lý người dùng" };
export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  await requireRole(["admin"]);

  const db = await getDb();
  const [userRows, departmentRows] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .orderBy(asc(departments.name)),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-slate-500">Tạo tài khoản thành viên và phân quyền.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tạo tài khoản mới</CardTitle>
          <CardDescription>
            Hệ thống tạo tài khoản với mật khẩu tạm (hiển thị một lần — gửi cho thành viên qua kênh
            an toàn). Thành viên có thể đổi mật khẩu bằng &quot;Quên mật khẩu&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm departments={departmentRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thành viên hiện có ({userRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {userRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-2 py-2 font-medium">Họ tên</th>
                    <th className="px-2 py-2 font-medium">Email</th>
                    <th className="px-2 py-2 font-medium">Vai trò</th>
                    <th className="px-2 py-2 font-medium">Phòng ban</th>
                    <th className="px-2 py-2 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.map((u) => {
                    const dept = departmentRows.find((d) => d.id === u.departmentId);
                    return (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="px-2 py-2 font-medium text-slate-700">{u.name || "—"}</td>
                        <td className="px-2 py-2 text-slate-600">{u.email}</td>
                        <td className="px-2 py-2 text-slate-600">{t.userRole[u.role]}</td>
                        <td className="px-2 py-2 text-slate-600">{dept?.name ?? "—"}</td>
                        <td className="px-2 py-2">
                          {u.isActive ? (
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
