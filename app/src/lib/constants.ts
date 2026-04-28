/**
 * Mắt Việt HR — Application Constants
 * All Vietnamese-only strings; aligned with PRD v2.0 §6 + FR-05.
 */

export const APP_NAME = "Mắt Việt HR";
export const APP_DESCRIPTION = "Hệ thống quản lý tuyển dụng thông minh";

export const ROLES = {
  admin: "Quản trị viên",
  hr: "Nhân sự",
  hiring_manager: "Trưởng phòng",
  bod: "Ban Giám đốc",
  tap_doan: "Quản lý Tập đoàn",
} as const;

export type Role = keyof typeof ROLES;

export const JOB_STATUS = {
  draft: "Bản nháp",
  open: "Đang tuyển",
  paused: "Tạm dừng",
  closed: "Đã đóng",
  filled: "Đã tuyển đủ",
} as const;

export type JobStatus = keyof typeof JOB_STATUS;

export const FLOW_TYPE = {
  staff: "Nhân viên (3 bước)",
  management: "Quản lý (4 bước)",
} as const;

export type FlowType = keyof typeof FLOW_TYPE;

export const PIPELINE_STAGES = [
  { code: "new", label: "Mới", color: "slate" },
  { code: "screening", label: "Đang chấm", color: "blue" },
  { code: "screened", label: "Đã chấm", color: "blue" },
  { code: "interview_scheduled", label: "Đã xếp lịch PV", color: "amber" },
  { code: "interviewed", label: "Đã PV", color: "amber" },
  { code: "test_sent", label: "Đã gửi test", color: "violet" },
  { code: "test_done", label: "Đã làm test", color: "violet" },
  { code: "recommended", label: "Đề xuất", color: "indigo" },
  { code: "salary_deal", label: "Deal lương", color: "indigo" },
  { code: "bod_review", label: "BOD duyệt", color: "indigo" },
  { code: "tap_doan_review", label: "Tập đoàn duyệt", color: "indigo" },
  { code: "offer_sent", label: "Đã gửi offer", color: "emerald" },
  { code: "offer_accepted", label: "Đã nhận offer", color: "emerald" },
  { code: "hired", label: "Đã tuyển", color: "green" },
  { code: "rejected", label: "Từ chối", color: "rose" },
  { code: "withdrew", label: "Rút hồ sơ", color: "zinc" },
] as const;

export type PipelineStageCode = (typeof PIPELINE_STAGES)[number]["code"];

export const SOURCES = {
  manual_upload: "Tải lên thủ công",
  email_inbox: "Hộp thư hr@",
  csv_import: "Nhập từ CSV",
  topcv_api: "TopCV API",
  referral: "Giới thiệu nội bộ",
} as const;

export type Source = keyof typeof SOURCES;

export const SCORING_CRITERIA = [
  { code: "industry_fit", label: "Ngành nghề phù hợp" },
  { code: "professional_skills", label: "Kỹ năng chuyên môn" },
  { code: "work_experience", label: "Kinh nghiệm làm việc" },
  { code: "years_experience", label: "Số năm kinh nghiệm" },
  { code: "education", label: "Trình độ học vấn" },
  { code: "location", label: "Địa điểm làm việc" },
] as const;

export type CriterionCode = (typeof SCORING_CRITERIA)[number]["code"];

export const WEIGHT_TEMPLATES = {
  sales: {
    name: "Sales (bán hàng)",
    weights: {
      industry_fit: 0.2,
      professional_skills: 0.2,
      work_experience: 0.2,
      years_experience: 0.15,
      education: 0.1,
      location: 0.15,
    },
  },
  optician: {
    name: "Kỹ thuật viên quang học",
    weights: {
      industry_fit: 0.25,
      professional_skills: 0.3,
      work_experience: 0.15,
      years_experience: 0.1,
      education: 0.15,
      location: 0.05,
    },
  },
  office: {
    name: "Văn phòng",
    weights: {
      industry_fit: 0.15,
      professional_skills: 0.25,
      work_experience: 0.2,
      years_experience: 0.15,
      education: 0.15,
      location: 0.1,
    },
  },
  manager: {
    name: "Quản lý",
    weights: {
      industry_fit: 0.2,
      professional_skills: 0.2,
      work_experience: 0.25,
      years_experience: 0.2,
      education: 0.1,
      location: 0.05,
    },
  },
} as const;

export const RECOMMENDATIONS = {
  strong_yes: "Rất nên tuyển",
  yes: "Nên tuyển",
  maybe: "Cân nhắc",
  no: "Không tuyển",
} as const;

export const INTERVIEW_TYPES = {
  in_person: "Trực tiếp",
  phone: "Điện thoại",
  video: "Video (Teams)",
} as const;

export const INTERVIEW_STATUS = {
  scheduled: "Đã lên lịch",
  completed: "Đã hoàn thành",
  cancelled: "Đã huỷ",
  no_show: "Không tham dự",
} as const;

export const APPROVAL_STEP_KIND = {
  hr_recommend: "HR đề xuất",
  manager_recommend: "Trưởng phòng đề xuất",
  salary_deal: "Deal lương",
  bod: "BOD duyệt",
  tap_doan: "Tập đoàn duyệt",
} as const;

export const APPROVAL_STATUS = {
  pending: "Đang chờ",
  approved: "Đã duyệt",
  rejected: "Từ chối",
} as const;

export const EMAIL_TEMPLATES = {
  receipt_ack: "Xác nhận đã nhận CV",
  interview_invite: "Lời mời phỏng vấn",
  interview_reminder_24h: "Nhắc lịch phỏng vấn 24h",
  assessment_send: "Gửi bài test",
  offer: "Thư mời nhận việc (Offer)",
  rejection: "Thư cảm ơn (Từ chối)",
  internal_approval_request: "Yêu cầu phê duyệt nội bộ",
} as const;
