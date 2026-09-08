import "server-only";
import { eq, like } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { employees, people, positions, candidates, jobs } from "@/db/schema";
import { getEmployeeByPerson, getEmployeeBySourceCandidate } from "./repository";
import type { Database } from "@/types/db";

type EmployeeStatus = Database["public"]["Enums"]["employee_status"];
type EmploymentType = Database["public"]["Enums"]["employment_type"];

export interface EmployeeFormInput {
  // person (identity — shared master, ADR 0012)
  full_name: string;
  email?: string | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  national_id?: string | null;
  bhxh_no?: string | null;
  tax_no?: string | null;
  permanent_address?: string | null;
  // employment
  employee_code?: string | null;
  department_id?: string | null;
  position_id?: string | null;
  manager_id?: string | null;
  store_location?: string | null;
  employment_type?: EmploymentType;
  status?: EmployeeStatus;
  hired_at?: string | null;
  start_date?: string | null;
  work_email?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  notes?: string | null;
}

const clean = (v: string | null | undefined): string | null => {
  const s = typeof v === "string" ? v.trim() : v;
  return s ? s : null;
};

/** Pure: next "MV####" from existing codes (max numeric suffix + 1). Testable. */
export function nextEmployeeCode(existingCodes: (string | null | undefined)[]): string {
  let max = 0;
  for (const code of existingCodes) {
    const m = code?.match(/^MV(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `MV${String(max + 1).padStart(4, "0")}`;
}

/** Next "MV####" code from the current max numeric suffix (low-volume, ≤200 staff). */
export async function generateEmployeeCode(db: Db): Promise<string> {
  const rows = await db
    .select({ code: employees.employee_code })
    .from(employees)
    .where(like(employees.employee_code, "MV%"));
  return nextEmployeeCode(rows.map((r) => r.code));
}

/** Find a position by title within a department, else create it (position catalog grows from hires). */
async function findOrCreatePosition(
  db: Db,
  title: string,
  departmentId: string | null,
): Promise<string | null> {
  const t = title.trim();
  if (!t) return null;
  const existing = await db
    .select({ id: positions.id })
    .from(positions)
    .where(eq(positions.title, t))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (existing) return existing.id;
  const inserted = await db
    .insert(positions)
    .values({ title: t, department_id: departmentId })
    .returning({ id: positions.id });
  return inserted[0]?.id ?? null;
}

/** Manually add an employee (creates a fresh person master). */
export async function createEmployeeManual(input: EmployeeFormInput): Promise<{ id: string }> {
  const fullName = input.full_name.trim();
  if (!fullName) throw new Error("Họ và tên không được để trống.");
  const db = await getDb();

  const insertedPerson = await db
    .insert(people)
    .values({
      full_name: fullName,
      email: clean(input.email),
      phone: clean(input.phone),
      dob: clean(input.dob),
      gender: clean(input.gender),
      national_id: clean(input.national_id),
      bhxh_no: clean(input.bhxh_no),
      tax_no: clean(input.tax_no),
      permanent_address: clean(input.permanent_address),
    })
    .returning({ id: people.id });
  const personId = insertedPerson[0]?.id;
  if (!personId) throw new Error("Không tạo được hồ sơ cá nhân.");

  const code = clean(input.employee_code) ?? (await generateEmployeeCode(db));
  const inserted = await db
    .insert(employees)
    .values({
      person_id: personId,
      employee_code: code,
      department_id: input.department_id || null,
      position_id: input.position_id || null,
      manager_id: input.manager_id || null,
      store_location: clean(input.store_location),
      employment_type: input.employment_type ?? "full_time",
      status: input.status ?? "probation",
      hired_at: clean(input.hired_at),
      start_date: clean(input.start_date),
      work_email: clean(input.work_email),
      bank_account: clean(input.bank_account),
      bank_name: clean(input.bank_name),
      emergency_contact_name: clean(input.emergency_contact_name),
      emergency_contact_phone: clean(input.emergency_contact_phone),
      notes: clean(input.notes),
    })
    .returning({ id: employees.id });
  const id = inserted[0]?.id;
  if (!id) throw new Error("Không tạo được nhân viên.");
  return { id };
}

/** Update an employee + its linked person master (both share one identity). */
export async function updateEmployee(id: string, input: EmployeeFormInput): Promise<void> {
  const fullName = input.full_name.trim();
  if (!fullName) throw new Error("Họ và tên không được để trống.");
  const db = await getDb();

  const emp = await db
    .select({ person_id: employees.person_id })
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!emp) throw new Error("Không tìm thấy nhân viên.");

  await db.batch([
    db
      .update(people)
      .set({
        full_name: fullName,
        email: clean(input.email),
        phone: clean(input.phone),
        dob: clean(input.dob),
        gender: clean(input.gender),
        national_id: clean(input.national_id),
        bhxh_no: clean(input.bhxh_no),
        tax_no: clean(input.tax_no),
        permanent_address: clean(input.permanent_address),
      })
      .where(eq(people.id, emp.person_id)),
    db
      .update(employees)
      .set({
        employee_code: clean(input.employee_code),
        department_id: input.department_id || null,
        position_id: input.position_id || null,
        manager_id: input.manager_id === id ? null : input.manager_id || null,
        store_location: clean(input.store_location),
        employment_type: input.employment_type ?? "full_time",
        status: input.status ?? "probation",
        hired_at: clean(input.hired_at),
        start_date: clean(input.start_date),
        work_email: clean(input.work_email),
        bank_account: clean(input.bank_account),
        bank_name: clean(input.bank_name),
        emergency_contact_name: clean(input.emergency_contact_name),
        emergency_contact_phone: clean(input.emergency_contact_phone),
        notes: clean(input.notes),
      })
      .where(eq(employees.id, id)),
  ]);
}

export async function setEmployeeStatus(id: string, status: EmployeeStatus): Promise<void> {
  const db = await getDb();
  await db.update(employees).set({ status }).where(eq(employees.id, id));
}

export interface ConvertResult {
  id: string;
  created: boolean;
}

/**
 * Idempotent candidate → employee conversion (ADR 0012). Called automatically
 * when a candidate reaches `hired`, and available as a manual backfill action.
 * Reuses the candidate's person_id so history is continuous (candidate → employee).
 */
export async function ensureEmployeeForCandidate(
  candidateId: string,
  opts: { requireHired?: boolean } = { requireHired: true },
): Promise<ConvertResult> {
  const db = await getDb();

  const cand = await db
    .select({
      id: candidates.id,
      person_id: candidates.person_id,
      full_name: candidates.full_name,
      email: candidates.email,
      phone: candidates.phone,
      job_id: candidates.job_id,
      current_stage: candidates.current_stage,
      expected_start_date: candidates.expected_start_date,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!cand) throw new Error("Không tìm thấy ứng viên.");
  if (opts.requireHired && cand.current_stage !== "hired") {
    throw new Error("Chỉ chuyển được ứng viên đã tuyển thành nhân viên.");
  }

  // Idempotency: already converted from this candidate, or a live employee for the person.
  const bySource = await getEmployeeBySourceCandidate(candidateId);
  if (bySource) return { id: bySource.id, created: false };

  // Ensure a person master exists (older candidate rows may lack person_id).
  let personId = cand.person_id;
  if (!personId) {
    const insertedPerson = await db
      .insert(people)
      .values({ full_name: cand.full_name, email: cand.email, phone: cand.phone })
      .returning({ id: people.id });
    personId = insertedPerson[0]?.id ?? null;
    if (!personId) throw new Error("Không tạo được hồ sơ cá nhân.");
    await db.update(candidates).set({ person_id: personId }).where(eq(candidates.id, candidateId));
  }

  const byPerson = await getEmployeeByPerson(personId, { excludeTerminated: true });
  if (byPerson) {
    // Link this candidate to the existing live employee for lineage.
    if (!byPerson.source_candidate_id) {
      await db
        .update(employees)
        .set({ source_candidate_id: candidateId })
        .where(eq(employees.id, byPerson.id));
    }
    return { id: byPerson.id, created: false };
  }

  const job = await db
    .select({ department_id: jobs.department_id, title: jobs.title })
    .from(jobs)
    .where(eq(jobs.id, cand.job_id))
    .limit(1)
    .then((r) => r[0] ?? null);

  const positionId = job?.title
    ? await findOrCreatePosition(db, job.title, job.department_id ?? null)
    : null;
  const code = await generateEmployeeCode(db);

  const inserted = await db
    .insert(employees)
    .values({
      person_id: personId,
      employee_code: code,
      department_id: job?.department_id ?? null,
      position_id: positionId,
      status: "probation",
      employment_type: "full_time",
      hired_at: new Date().toISOString(),
      start_date: cand.expected_start_date ?? null,
      source_candidate_id: candidateId,
    })
    .returning({ id: employees.id });
  const id = inserted[0]?.id;
  if (!id) throw new Error("Không tạo được nhân viên.");

  // Propose the onboarding packet (H1) — best-effort, never fails the conversion.
  try {
    const { proposeOnboardingPacket } = await import("@/server/employee-agent/generators");
    await proposeOnboardingPacket({ employeeId: id, employeeName: cand.full_name });
  } catch {
    // recoverable — HR can seed onboarding manually from the profile
  }

  return { id, created: true };
}
