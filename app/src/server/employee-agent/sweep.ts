import "server-only";
import { listActiveContractsEndingBefore } from "@/server/contracts/repository";
import { proposeProbationReview, proposeContractRenewal } from "./generators";
import type { Database } from "@/types/db";

type ContractType = Database["public"]["Enums"]["contract_type"];

export const PROBATION_WINDOW_DAYS = 7;
export const RENEWAL_WINDOW_DAYS = 30;

/** Whole-day difference endDate − today (both YYYY-MM-DD, treated as UTC). */
export function daysUntil(todayIso: string, endDateIso: string): number {
  return Math.floor((Date.parse(endDateIso) - Date.parse(todayIso)) / 86_400_000);
}

/**
 * Pure: which lifecycle proposal (if any) an active dated contract warrants.
 * - thử việc ending within PROBATION_WINDOW_DAYS → probation_review
 * - xác định thời hạn ending within RENEWAL_WINDOW_DAYS → contract_renewal
 * (already-past dates still fire — HR must act; dedupe prevents spam.)
 */
export function classifyContractClock(
  type: ContractType,
  endDateIso: string | null,
  todayIso: string,
): "probation_review" | "contract_renewal" | null {
  if (!endDateIso) return null;
  const days = daysUntil(todayIso, endDateIso);
  if (type === "thu_viec") return days <= PROBATION_WINDOW_DAYS ? "probation_review" : null;
  if (type === "xac_dinh_thoi_han") return days <= RENEWAL_WINDOW_DAYS ? "contract_renewal" : null;
  return null;
}

/** Nightly compliance sweep — scans active dated contracts, emits proposals. */
export async function sweepEmployeeCompliance(): Promise<{ probation: number; renewal: number }> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + RENEWAL_WINDOW_DAYS);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const contracts = await listActiveContractsEndingBefore(horizonIso);
  let probation = 0;
  let renewal = 0;
  for (const c of contracts) {
    const kind = classifyContractClock(c.type, c.end_date, todayIso);
    if (kind === "probation_review") {
      await proposeProbationReview({
        employeeId: c.employee_id,
        employeeName: c.employee_name,
        contractId: c.id,
        endDate: c.end_date,
      });
      probation++;
    } else if (kind === "contract_renewal") {
      await proposeContractRenewal({
        employeeId: c.employee_id,
        employeeName: c.employee_name,
        contractId: c.id,
        currentType: c.type,
        endDate: c.end_date,
      });
      renewal++;
    }
  }
  return { probation, renewal };
}
