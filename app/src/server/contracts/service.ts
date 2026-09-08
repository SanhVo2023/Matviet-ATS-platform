import "server-only";
import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { contracts } from "@/db/schema";
import type { Database } from "@/types/db";

type ContractType = Database["public"]["Enums"]["contract_type"];
type ContractStatus = Database["public"]["Enums"]["contract_status"];

export interface ContractInput {
  type: ContractType;
  contract_no?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  base_salary?: number | null;
  status?: ContractStatus;
  signed_at?: string | null;
  notes?: string | null;
}

const clean = (v: string | null | undefined): string | null => {
  const s = typeof v === "string" ? v.trim() : v;
  return s ? s : null;
};

/** Indefinite-term contracts never carry an end_date. */
function normalizeEnd(type: ContractType, endDate: string | null): string | null {
  return type === "khong_xac_dinh_thoi_han" ? null : endDate;
}

export async function createContract(
  employeeId: string,
  input: ContractInput,
  createdBy: string | null,
): Promise<{ id: string }> {
  const db = await getDb();
  const inserted = await db
    .insert(contracts)
    .values({
      employee_id: employeeId,
      type: input.type,
      contract_no: clean(input.contract_no),
      start_date: clean(input.start_date),
      end_date: normalizeEnd(input.type, clean(input.end_date)),
      base_salary: input.base_salary ?? null,
      status: input.status ?? "active",
      signed_at: clean(input.signed_at),
      notes: clean(input.notes),
      created_by: createdBy,
    })
    .returning({ id: contracts.id });
  const id = inserted[0]?.id;
  if (!id) throw new Error("Không tạo được hợp đồng.");
  return { id };
}

export async function updateContract(id: string, input: ContractInput): Promise<void> {
  const db = await getDb();
  await db
    .update(contracts)
    .set({
      type: input.type,
      contract_no: clean(input.contract_no),
      start_date: clean(input.start_date),
      end_date: normalizeEnd(input.type, clean(input.end_date)),
      base_salary: input.base_salary ?? null,
      status: input.status ?? "active",
      signed_at: clean(input.signed_at),
      notes: clean(input.notes),
    })
    .where(eq(contracts.id, id));
}

export async function endContract(id: string): Promise<void> {
  const db = await getDb();
  await db.update(contracts).set({ status: "ended" }).where(eq(contracts.id, id));
}

export async function deleteContract(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(contracts).where(eq(contracts.id, id));
}

/**
 * Seed the initial probation contract for a new hire (H1 onboarding).
 * `db` passed in so it can run inside the onboarding-packet execution.
 * Default probation: 60 days from start (Bộ luật LĐ 2019 for degree roles —
 * HR can edit). No-op if the employee already has any contract.
 */
export async function seedProbationContract(
  db: Db,
  employeeId: string,
  opts: { startDate?: string | null; baseSalary?: number | null; createdBy?: string | null } = {},
): Promise<void> {
  const existing = await db
    .select({ id: contracts.id })
    .from(contracts)
    .where(eq(contracts.employee_id, employeeId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (existing) return;

  const start = opts.startDate ? new Date(opts.startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 60);

  await db.insert(contracts).values({
    employee_id: employeeId,
    type: "thu_viec",
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    base_salary: opts.baseSalary ?? null,
    status: "active",
    created_by: opts.createdBy ?? null,
  });
}
