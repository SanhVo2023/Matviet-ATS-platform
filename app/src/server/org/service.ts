import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { departments, positions, employees } from "@/db/schema";

export interface DepartmentInput {
  name: string;
  code?: string | null;
  parent_id?: string | null;
  head_user_id?: string | null;
}

export async function createDepartment(input: DepartmentInput): Promise<{ id: string }> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên phòng ban không được để trống.");
  const db = await getDb();
  const inserted = await db
    .insert(departments)
    .values({
      name,
      code: input.code?.trim() || null,
      parent_id: input.parent_id || null,
      head_user_id: input.head_user_id || null,
    })
    .returning({ id: departments.id });
  const row = inserted[0];
  if (!row) throw new Error("Không tạo được phòng ban.");
  return { id: row.id };
}

export async function updateDepartment(id: string, input: DepartmentInput): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên phòng ban không được để trống.");
  if (input.parent_id === id) throw new Error("Phòng ban không thể trực thuộc chính nó.");
  const db = await getDb();
  await db
    .update(departments)
    .set({
      name,
      code: input.code?.trim() || null,
      parent_id: input.parent_id || null,
      head_user_id: input.head_user_id || null,
    })
    .where(eq(departments.id, id));
}

/** Guarded delete: refuses if the department still has employees, positions, or child departments. */
export async function deleteDepartment(id: string): Promise<void> {
  const db = await getDb();
  const [emp, pos, children] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.department_id, id))
      .then((r) => Number(r[0]?.n ?? 0)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(positions)
      .where(eq(positions.department_id, id))
      .then((r) => Number(r[0]?.n ?? 0)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(departments)
      .where(eq(departments.parent_id, id))
      .then((r) => Number(r[0]?.n ?? 0)),
  ]);
  if (emp > 0 || pos > 0 || children > 0) {
    throw new Error("Không thể xóa: vẫn còn nhân viên, vị trí hoặc phòng ban con.");
  }
  await db.delete(departments).where(eq(departments.id, id));
}

export interface PositionInput {
  title: string;
  department_id?: string | null;
}

export async function createPosition(input: PositionInput): Promise<{ id: string }> {
  const title = input.title.trim();
  if (!title) throw new Error("Tên vị trí không được để trống.");
  const db = await getDb();
  const inserted = await db
    .insert(positions)
    .values({ title, department_id: input.department_id || null })
    .returning({ id: positions.id });
  const row = inserted[0];
  if (!row) throw new Error("Không tạo được vị trí.");
  return { id: row.id };
}

export async function updatePosition(id: string, input: PositionInput): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error("Tên vị trí không được để trống.");
  const db = await getDb();
  await db
    .update(positions)
    .set({ title, department_id: input.department_id || null })
    .where(eq(positions.id, id));
}

/** Guarded delete: refuses if any employee still holds this position. */
export async function deletePosition(id: string): Promise<void> {
  const db = await getDb();
  const held = await db
    .select({ n: sql<number>`count(*)` })
    .from(employees)
    .where(and(eq(employees.position_id, id)))
    .then((r) => Number(r[0]?.n ?? 0));
  if (held > 0) throw new Error("Không thể xóa: vẫn còn nhân viên giữ vị trí này.");
  await db.delete(positions).where(eq(positions.id, id));
}
