// Per-criterion rubric calibration text — copied from
// app/src/server/scoring/rubric-content.ts (Deno-compatible).

import type { CriterionCode } from "./types.ts";

export type RoleFamilyKey = "sales" | "optician" | "office" | "manager" | "custom";
export type OfficeSubFamily = "hr" | "accounting" | "marketing" | "admin" | "it_support";

interface CriterionGuidance {
  weight: number;
  guidance_vi: string;
}

type FamilyRubric = Record<CriterionCode, CriterionGuidance>;

const YEARS_GENERIC: CriterionGuidance = {
  weight: 0.15,
  guidance_vi: `Yêu cầu mặc định: 1+ năm phù hợp.
- 100: ≥3 năm
- 80: 2-3 năm
- 60: 1-2 năm
- 40: 6-12 tháng
- 20: <6 tháng hoặc fresher`,
};

const LOCATION_GENERIC: CriterionGuidance = {
  weight: 0.15,
  guidance_vi: `- 100: Cùng quận/khu vực với cửa hàng
- 80: Cùng thành phố, di chuyển <30 phút
- 60: Cùng thành phố, di chuyển 30-60 phút
- 40: Tỉnh lân cận, có thể chuyển đến nếu được hỗ trợ
- <40: Khoảng cách lớn, không khả thi`,
};

const EDU_GENERIC: CriterionGuidance = {
  weight: 0.1,
  guidance_vi: `- 90+: Cao đẳng/đại học các ngành liên quan
- 70-89: Cao đẳng/đại học bất kỳ ngành
- 50-69: Tốt nghiệp THPT + chứng chỉ nghề
- 30-49: Tốt nghiệp THPT, không có chứng chỉ
- <30: Chưa tốt nghiệp THPT`,
};

const SALES_RUBRIC: FamilyRubric = {
  industry_fit: {
    weight: 0.2,
    guidance_vi: `- 90+: Có kinh nghiệm bán lẻ trực tiếp tại các chuỗi tương tự (kính mắt, đồng hồ, mỹ phẩm, thời trang).
- 70-89: Có kinh nghiệm bán hàng tại cửa hàng/showroom (không nhất thiết kính mắt).
- 50-69: Có kinh nghiệm dịch vụ khách hàng trực tiếp (F&B, telesales, lễ tân) nhưng chưa làm bán lẻ.
- 30-49: Có làm việc với khách hàng nhưng không bán hàng.
- <30: Hoàn toàn không có kinh nghiệm dịch vụ khách hàng / bán hàng.`,
  },
  professional_skills: {
    weight: 0.2,
    guidance_vi: `- 90+: Kỹ năng bán hàng được chứng minh (chỉ tiêu doanh số đạt, được training chuyên sâu, có chứng chỉ).
- 70-89: Có kinh nghiệm thực tế bán hàng + giao tiếp tốt.
- 50-69: Giao tiếp ổn, có thể đào tạo về sản phẩm.
- 30-49: Hạn chế trong giao tiếp khách hàng, cần đào tạo cơ bản.
- <30: Không có kỹ năng giao tiếp / bán hàng nào nêu rõ.`,
  },
  work_experience: {
    weight: 0.2,
    guidance_vi: `Đánh giá chất lượng (vai trò + công ty + thành tựu) hơn là chỉ số năm.
- 90+: Đảm nhận nhân viên bán hàng cao cấp / supervisor tại chuỗi bán lẻ uy tín, có thành tích cụ thể.
- 70-89: Bán hàng 1+ năm có thành tích đo được.
- 50-69: Bán hàng nhưng không nêu rõ thành tích.
- 30-49: Có làm bán hàng ngắn hạn (<6 tháng) hoặc thời vụ.
- <30: Không có kinh nghiệm bán hàng nào liệt kê.`,
  },
  years_experience: YEARS_GENERIC,
  education: EDU_GENERIC,
  location: LOCATION_GENERIC,
};

const OPTICAL_RUBRIC: FamilyRubric = {
  industry_fit: {
    weight: 0.25,
    guidance_vi: `- 90+: Có chứng chỉ kỹ thuật viên quang học + đã làm việc tại cửa hàng kính mắt.
- 70-89: Có chứng chỉ quang học nhưng kinh nghiệm ngắn hoặc tại nha khoa / y tế lân cận.
- 50-69: Có nền tảng kỹ thuật y tế (điều dưỡng, dược, phòng lab) nhưng chưa làm quang học.
- 30-49: Nền tảng kỹ thuật chung (điện tử, cơ khí precision).
- <30: Hoàn toàn không có kỹ thuật.`,
  },
  professional_skills: {
    weight: 0.3,
    guidance_vi: `- 90+: Đo khúc xạ, làm đeo kính, gọt mài tròng kính bằng máy chuyên dụng. Hiểu sản phẩm tròng đa chức năng.
- 70-89: Có kỹ năng đo khúc xạ + lắp ráp cơ bản.
- 50-69: Đã được đào tạo cơ bản, cần training thêm.
- 30-49: Có kiến thức nền nhưng chưa thực hành.
- <30: Không có kỹ năng quang học.`,
  },
  work_experience: {
    weight: 0.15,
    guidance_vi: `- 90+: Làm tại cửa hàng kính mắt uy tín >2 năm.
- 70-89: 1-2 năm tại cửa hàng kính mắt.
- 50-69: Thực tập / part-time tại cửa hàng kính mắt.
- 30-49: Kỹ thuật y tế khác.
- <30: Không có kinh nghiệm liên quan.`,
  },
  years_experience: { ...YEARS_GENERIC, weight: 0.1 },
  education: {
    weight: 0.15,
    guidance_vi: `- 90+: Cao đẳng/Đại học Quang học, Y học, Kỹ thuật y tế. Có chứng chỉ KTV khúc xạ Bộ Y tế.
- 70-89: Cao đẳng kỹ thuật y tế bất kỳ.
- 50-69: Trung cấp kỹ thuật.
- <50: Không có học vấn kỹ thuật.`,
  },
  location: { ...LOCATION_GENERIC, weight: 0.05 },
};

const OFFICE_BASE: FamilyRubric = {
  industry_fit: {
    weight: 0.15,
    guidance_vi: `- Bán lẻ / FMCG / dịch vụ tốt hơn nền B2B thuần túy.
- Văn phòng hỗ trợ hoạt động cửa hàng được điểm cao hơn nếu có bối cảnh retail.`,
  },
  professional_skills: {
    weight: 0.25,
    guidance_vi: `Đánh giá theo từng vị trí cụ thể — xem hướng dẫn theo job title trong system note.`,
  },
  work_experience: {
    weight: 0.2,
    guidance_vi: `Quy mô công ty trước đó tương đương (50-500 nhân sự) cộng điểm.`,
  },
  years_experience: YEARS_GENERIC,
  education: { ...EDU_GENERIC, weight: 0.15 },
  location: { ...LOCATION_GENERIC, weight: 0.1 },
};

const OFFICE_SUB_GUIDANCE: Record<OfficeSubFamily, string> = {
  hr: `Vị trí HR: tuyển dụng, đào tạo, lương thưởng, BHXH, luật lao động, onboarding, đánh giá hiệu suất.`,
  accounting: `Vị trí Kế toán: Misa/Fast/Bravo, kê khai thuế, báo cáo tài chính, kiểm toán nội bộ, công nợ, tồn kho.`,
  marketing: `Vị trí Marketing: social media, content, ROAS, data driven, SEO, email marketing, branding.`,
  admin: `Vị trí Hành chính: Excel, ngoại ngữ, quản lý văn phòng, hậu cần, lễ tân, văn thư.`,
  it_support: `Vị trí IT support: mạng nội bộ, Windows Server, Microsoft 365, hỗ trợ end-user, hardware.`,
};

function detectOfficeSub(jobTitle: string): OfficeSubFamily {
  const t = jobTitle.toLowerCase();
  if (/(hr|nhân sự|tuyển dụng|c&b|payroll)/.test(t)) return "hr";
  if (/(kế toán|accountant|kiểm toán|tài chính|finance)/.test(t)) return "accounting";
  if (/(marketing|content|seo|truyền thông|brand)/.test(t)) return "marketing";
  if (/(it|công nghệ|hỗ trợ|support|admin sys|tech)/.test(t)) return "it_support";
  return "admin";
}

const MANAGER_RUBRIC: FamilyRubric = {
  industry_fit: {
    weight: 0.2,
    guidance_vi: `- 90+: Đã quản lý chuỗi cửa hàng bán lẻ >50 nhân viên.
- 70-89: Đã quản lý cửa hàng đơn lẻ trong ngành bán lẻ.
- 50-69: Quản lý ngành dịch vụ khác (KS, F&B).
- 30-49: Quản lý team văn phòng nhưng không retail.
- <30: Không có kinh nghiệm quản lý.`,
  },
  professional_skills: {
    weight: 0.2,
    guidance_vi: `Lãnh đạo team, quản lý KPI, P&L cửa hàng, đào tạo nhân sự, xử lý khiếu nại VIP.`,
  },
  work_experience: {
    weight: 0.25,
    guidance_vi: `- 90+: Quản lý cửa hàng / chuỗi >5 năm với tăng trưởng doanh số đo được.
- 70-89: Quản lý 3-5 năm.
- 50-69: Quản lý 1-3 năm hoặc supervisor lâu năm.
- 30-49: Mới lên quản lý.
- <30: Chưa có vai trò quản lý chính thức.`,
  },
  years_experience: {
    weight: 0.2,
    guidance_vi: `- 100: ≥7 năm tổng
- 80: 5-7 năm
- 60: 3-5 năm
- 40: 1-3 năm
- <40: dưới 1 năm`,
  },
  education: {
    ...EDU_GENERIC,
    guidance_vi: EDU_GENERIC.guidance_vi + "\n- Cộng nhẹ điểm cho MBA / chứng chỉ quản lý.",
  },
  location: {
    ...LOCATION_GENERIC,
    weight: 0.05,
    guidance_vi: "Ít quan trọng — lãnh đạo có thể di chuyển nhiều giữa cửa hàng.",
  },
};

const RUBRIC_BY_FAMILY: Record<RoleFamilyKey, FamilyRubric> = {
  sales: SALES_RUBRIC,
  optician: OPTICAL_RUBRIC,
  office: OFFICE_BASE,
  manager: MANAGER_RUBRIC,
  custom: SALES_RUBRIC,
};

export function getRubricForJob(
  roleFamily: string,
  jobTitle: string,
): {
  rubric: FamilyRubric;
  extraSystemNote: string;
} {
  const family = (
    RUBRIC_BY_FAMILY[roleFamily as RoleFamilyKey] ? roleFamily : "custom"
  ) as RoleFamilyKey;
  const rubric = RUBRIC_BY_FAMILY[family];
  if (family === "office") {
    const sub = detectOfficeSub(jobTitle);
    return {
      rubric,
      extraSystemNote: `Vị trí thuộc nhóm Văn phòng — sub-rubric: ${sub}.\n${OFFICE_SUB_GUIDANCE[sub]}`,
    };
  }
  return { rubric, extraSystemNote: "" };
}

export function rubricGuidanceMap(rubric: FamilyRubric): Record<CriterionCode, string> {
  return {
    industry_fit: rubric.industry_fit.guidance_vi,
    professional_skills: rubric.professional_skills.guidance_vi,
    work_experience: rubric.work_experience.guidance_vi,
    years_experience: rubric.years_experience.guidance_vi,
    education: rubric.education.guidance_vi,
    location: rubric.location.guidance_vi,
  };
}
