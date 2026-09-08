import "server-only";
import { createProposal } from "@/server/agent-flows/repository";
import { formatDate } from "@/lib/vi-format";
import type { Database } from "@/types/db";

type ContractType = Database["public"]["Enums"]["contract_type"];

/**
 * Employee-lifecycle proposal generators (HRM H1). All propose-first: they
 * prepare a fully-formed card; a human taps Duyệt (execute.ts runs the same
 * service a manual action would). Keyed by employee_id / contract_id, never
 * candidate_id. Dedupe prefix `ep:`.
 */

export async function proposeOnboardingPacket(args: {
  employeeId: string;
  employeeName: string;
}): Promise<void> {
  await createProposal({
    jobId: null,
    employeeId: args.employeeId,
    kind: "onboarding_packet",
    summary: `Chuẩn bị hội nhập cho ${args.employeeName}`,
    reasoning:
      "Nhân viên mới vừa được tạo từ ứng viên đã tuyển. Duyệt để tạo danh sách hội nhập chuẩn (giấy tờ, thiết bị, đào tạo) và hợp đồng thử việc 60 ngày.",
    payload: {},
    dedupeKey: `ep:onb:${args.employeeId}`,
  });
}

export async function proposeProbationReview(args: {
  employeeId: string;
  employeeName: string;
  contractId: string;
  endDate: string;
}): Promise<void> {
  await createProposal({
    jobId: null,
    employeeId: args.employeeId,
    kind: "probation_review",
    summary: `Sắp hết thử việc: ${args.employeeName} — đánh giá & quyết định`,
    reasoning: `Hợp đồng thử việc kết thúc ngày ${formatDate(args.endDate)}. Duyệt để xác nhận đạt và chuyển nhân viên sang chính thức (nếu cần gia hạn/kết thúc thử việc thì thao tác trên hồ sơ).`,
    payload: { contract_id: args.contractId, end_date: args.endDate },
    dedupeKey: `ep:prob:${args.contractId}`,
  });
}

export async function proposeContractRenewal(args: {
  employeeId: string;
  employeeName: string;
  contractId: string;
  currentType: ContractType;
  endDate: string;
}): Promise<void> {
  await createProposal({
    jobId: null,
    employeeId: args.employeeId,
    kind: "contract_renewal",
    summary: `Hợp đồng sắp hết hạn: ${args.employeeName}`,
    reasoning: `Hợp đồng (${args.currentType === "xac_dinh_thoi_han" ? "xác định thời hạn" : "thử việc"}) kết thúc ngày ${formatDate(args.endDate)}. Duyệt để tạo hợp đồng gia hạn (kiểm tra loại & điều khoản trước khi ký).`,
    payload: {
      contract_id: args.contractId,
      current_type: args.currentType,
      end_date: args.endDate,
    },
    dedupeKey: `ep:renew:${args.contractId}`,
  });
}
