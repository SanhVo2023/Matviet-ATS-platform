/**
 * Vietnamese-first prompts for Gemini.
 *
 * Pass 1 (parse): system prompt + user message.
 * Pass 2 (score): user message that includes job context + parsed CV +
 *   per-criterion rubric guidance.
 *
 * The model call lives in src/server/scoring/worker.ts (Workers AI, ADR 0013); these builders
 * are pure string functions usable from both Next.js and Deno.
 */

import type { CriterionCode, ParsedCv, Weights } from "./types";

export const PARSE_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích CV cho Mắt Việt — chuỗi cửa hàng mắt kính tại Việt Nam.

Trích xuất thông tin có cấu trúc từ CV đính kèm và trả về JSON đúng schema được cung cấp.

Yêu cầu:
- Giữ nguyên tiếng Việt cho tên riêng, địa điểm, tên công ty.
- Với kỹ năng: liệt kê thành các cụm từ ngắn (≤ 3 từ).
- Với kinh nghiệm: sắp xếp theo thời gian giảm dần (mới nhất trước).
- Với education: nếu CV chỉ có "tốt nghiệp THPT" thì điền institution="THPT", degree="Tốt nghiệp THPT".
- Nếu không tìm thấy thông tin nào đó, để null (KHÔNG đoán hoặc bịa).
- Ngôn ngữ CV có thể là tiếng Việt, tiếng Anh, hoặc hỗn hợp — output luôn giữ nguyên gốc.
- total_years_experience: tính tổng kinh nghiệm tích lũy (làm tròn đến 0.5 năm); nếu không thể tính, để null.`;

export const PARSE_USER_PROMPT = `Hãy trích xuất CV đính kèm.`;

interface BuildScorePromptArgs {
  jobTitle: string;
  jobDescription: string; // plain text or HTML — passed verbatim
  jobRequirementsHtml: string;
  jobLocation: string | null;
  roleFamily: string;
  weights: Weights;
  rubricGuidance: Record<CriterionCode, string>;
  parsedCv: ParsedCv;
}

export function buildScoreSystemPrompt(): string {
  return `Bạn là chuyên gia tuyển dụng cho Mắt Việt — chuỗi cửa hàng mắt kính tại Việt Nam.

Nhiệm vụ: chấm điểm 6 tiêu chí cho ứng viên, mỗi tiêu chí 0-100, dựa trên CV đã được phân tích.

Quy tắc QUAN TRỌNG về evidence_quotes:
- Mỗi quote phải được TRÍCH DẪN NGUYÊN VĂN từ CV (không tóm tắt, không paraphrase).
- 1-3 quotes cho mỗi tiêu chí. Nếu không có bằng chứng cụ thể, trả về mảng rỗng.
- Nếu phải dịch, KHÔNG dịch — giữ nguyên ngôn ngữ gốc của CV.

Quy tắc về score:
- Số nguyên 0-100. Dùng thang đo trong "Hướng dẫn chấm điểm" được cung cấp.
- Khi không đủ thông tin: chấm 30-50 + nêu rõ "thiếu thông tin" trong reasoning.
- Tuyên bố chung chung KHÔNG kèm công ty/thời gian/số liệu cụ thể ("chuyên gia số 1", "doanh số luôn cao nhất") KHÔNG phải bằng chứng — chấm ≤ 40 và ghi "chỉ có tuyên bố, thiếu bằng chứng cụ thể".
- Sinh viên mới tốt nghiệp có thực tập/hoạt động liên quan: chấm theo những gì thể hiện được trong CV (thường 35-55), không chấm 0.

Quy tắc về reasoning:
- 1-2 câu tiếng Việt, ngắn gọn, nêu rõ TẠI SAO cho điểm này (không lặp lại evidence quote).

overall_summary: 2-3 câu tiếng Việt, đánh giá tổng thể cho HR (không phải cho ứng viên).`;
}

export function buildScoreUserPrompt(args: BuildScorePromptArgs): string {
  const {
    jobTitle,
    jobDescription,
    jobRequirementsHtml,
    jobLocation,
    roleFamily,
    weights,
    rubricGuidance,
    parsedCv,
  } = args;

  const weightLine = (k: CriterionCode) => `${k} (trọng số ${Math.round(weights[k] * 100)}%)`;

  // Strip HTML tags from descriptions for cleaner prompt — Gemini can read HTML but it wastes tokens.
  const cleanDescription = stripTags(jobDescription).trim();
  const cleanRequirements = stripTags(jobRequirementsHtml).trim();

  return `# Vị trí cần chấm điểm

**Tiêu đề:** ${jobTitle}
**Loại vị trí (role family):** ${roleFamily}
**Địa điểm:** ${jobLocation ?? "không bắt buộc"}

**Mô tả công việc:**
${cleanDescription || "(chưa có)"}

**Yêu cầu:**
${cleanRequirements || "(chưa có)"}

# 6 tiêu chí chấm điểm

1. **${weightLine("industry_fit")}** — Phù hợp ngành nghề
${rubricGuidance.industry_fit}

2. **${weightLine("professional_skills")}** — Kỹ năng chuyên môn
${rubricGuidance.professional_skills}

3. **${weightLine("work_experience")}** — Chất lượng kinh nghiệm làm việc
${rubricGuidance.work_experience}

4. **${weightLine("years_experience")}** — Số năm kinh nghiệm
${rubricGuidance.years_experience}

5. **${weightLine("education")}** — Trình độ học vấn
${rubricGuidance.education}

6. **${weightLine("location")}** — Địa điểm
${rubricGuidance.location}

# Hồ sơ ứng viên (đã được phân tích)

\`\`\`json
${JSON.stringify(stripRawText(parsedCv), null, 2)}
\`\`\`

Chấm điểm theo schema được cung cấp. Trả về JSON, không kèm giải thích bên ngoài JSON.`;
}

/** Drop the synthesized _raw_text field — Gemini doesn't need it for scoring. */
function stripRawText(parsed: ParsedCv): Omit<ParsedCv, "_raw_text"> {
  const copy = { ...parsed };
  delete (copy as Partial<ParsedCv>)._raw_text;
  return copy as Omit<ParsedCv, "_raw_text">;
}

/** Cheap HTML→text strip. Tiptap output uses paragraph + list tags only; no scripts. */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}
