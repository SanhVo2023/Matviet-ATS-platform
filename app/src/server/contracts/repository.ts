import "server-only";
import { and, desc, eq, isNotNull, lte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { contracts, employees, people } from "@/db/schema";
import type { Tables } from "@/types/db";

export type ContractRow = Tables<"contracts">;

export async function listContractsForEmployee(employeeId: string): Promise<ContractRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(contracts)
    .where(eq(contracts.employee_id, employeeId))
    .orderBy(desc(contracts.start_date));
}

export async function getContract(id: string): Promise<ContractRow | null> {
  const db = await getDb();
  const rows = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return rows[0] ?? null;
}

export interface ExpiringContract {
  id: string;
  employee_id: string;
  employee_name: string;
  type: ContractRow["type"];
  end_date: string;
}

/**
 * Active, dated contracts ending on/before `beforeIso` — the compliance sweep's
 * source for probation-review (type thu_viec) and contract-renewal proposals.
 */
export async function listActiveContractsEndingBefore(
  beforeIso: string,
): Promise<ExpiringContract[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contracts.id,
      employee_id: contracts.employee_id,
      employee_name: people.full_name,
      type: contracts.type,
      end_date: contracts.end_date,
    })
    .from(contracts)
    .innerJoin(employees, eq(contracts.employee_id, employees.id))
    .innerJoin(people, eq(employees.person_id, people.id))
    .where(
      and(
        eq(contracts.status, "active"),
        isNotNull(contracts.end_date),
        lte(contracts.end_date, beforeIso),
        ne(employees.status, "terminated"),
      ),
    );
  return rows.filter((r): r is ExpiringContract => !!r.end_date);
}
