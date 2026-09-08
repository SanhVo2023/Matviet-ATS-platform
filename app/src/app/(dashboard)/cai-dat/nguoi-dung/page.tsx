import type { Metadata } from "next";
import { desc, asc } from "drizzle-orm";
import { Settings } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/db";
import { users, departments } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TableFrame,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/primitives/PageHeader";
import { PageContainer } from "@/components/primitives/PageContainer";
import { t } from "@/lib/i18n";
import { StatusPill } from "@/components/primitives/StatusPill";
import { InviteForm } from "./InviteForm";
import { UserRowActions } from "./UserRowActions";

export const metadata: Metadata = { title: "Quản lý người dùng" };
export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const me = await requireRole(["admin"]);

  const db = await getDb();
  const [userRows, departmentRows] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .orderBy(asc(departments.name)),
  ]);

  return (
    <PageContainer size="detail" className="space-y-6">
      <PageHeader
        back="/cai-dat"
        backLabel="Cài đặt"
        icon={Settings}
        title="Quản lý người dùng"
        subtitle="Tạo tài khoản thành viên và phân quyền."
      />

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
            <TableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRows.map((u) => {
                    const dept = departmentRows.find((d) => d.id === u.departmentId);
                    return (
                      <TableRow key={u.id} className="transition-colors hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">
                          {u.name || "—"}
                        </TableCell>
                        <TableCell className="text-slate-600">{u.email}</TableCell>
                        <TableCell className="text-slate-600">{t.userRole[u.role]}</TableCell>
                        <TableCell className="text-slate-600">{dept?.name ?? "—"}</TableCell>
                        <TableCell>
                          {u.isActive ? (
                            <StatusPill tone="success" dot>
                              Đang hoạt động
                            </StatusPill>
                          ) : (
                            <StatusPill tone="neutral">Vô hiệu</StatusPill>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <UserRowActions
                            user={{
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              role: u.role,
                              departmentId: u.departmentId,
                              phone: u.phone,
                              isActive: u.isActive,
                            }}
                            departments={departmentRows}
                            isSelf={u.id === me.id}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableFrame>
          ) : (
            <p className="text-sm text-slate-500">Chưa có thành viên nào.</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
