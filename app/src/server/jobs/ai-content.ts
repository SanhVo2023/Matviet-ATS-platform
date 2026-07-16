import "server-only";
import { aiChat } from "@/lib/ai/workers-ai";
import { t } from "@/lib/i18n";
import type { ROLE_FAMILIES } from "@/lib/validation/job";

type RoleFamily = (typeof ROLE_FAMILIES)[number];

/**
 * AI-drafted JD content (shared core). Used by the job form's "Viết bằng AI"
 * action AND the agent's job_from_intent generator (ADR 0020) — one prompt,
 * one output contract.
 */
export async function generateJobContent(args: {
  title: string;
  roleFamily: RoleFamily;
  location?: string | null;
  feature?: string;
}): Promise<{ description_html: string; requirements_html: string }> {
  const { text } = await aiChat(
    [
      {
        role: "system",
        content:
          "Bạn viết nội dung tuyển dụng tiếng Việt cho Mắt Việt — chuỗi cửa hàng mắt kính bán lẻ tại Việt Nam. " +
          "Giọng chuyên nghiệp, ấm áp, thực tế với thị trường lao động Việt Nam. " +
          "Trả về CHÍNH XÁC định dạng sau, không thêm chữ nào khác:\n" +
          "MOTA:\n<HTML mô tả công việc: 1 đoạn <p> giới thiệu ngắn về vị trí, tiếp theo <p><strong>Nhiệm vụ chính:</strong></p> + <ul> 4-6 <li>, rồi <p><strong>Quyền lợi:</strong></p> + <ul> 3-4 <li>>\n" +
          "YEUCAU:\n<HTML yêu cầu ứng viên: <ul> 4-6 <li> về kinh nghiệm, kỹ năng, thái độ>\n" +
          "Chỉ dùng thẻ <p>, <ul>, <li>, <strong>. Không dùng markdown, không bịa mức lương hay địa chỉ cụ thể.",
      },
      {
        role: "user",
        content: `Chức danh: ${args.title}. Loại vị trí: ${t.roleFamily[args.roleFamily]}. Địa điểm làm việc: ${args.location?.trim() || "chưa xác định"}.`,
      },
    ],
    { maxTokens: 4096, temperature: 0.5, feature: args.feature ?? "jd_generate" },
  );
  const m = text.match(/MOTA:\s*([\s\S]*?)\s*YEUCAU:\s*([\s\S]+)/);
  if (!m || !m[1]?.trim() || !m[2]?.trim()) {
    throw new Error("AI trả về sai định dạng — vui lòng thử lại.");
  }
  return {
    description_html: cleanAiHtml(m[1]),
    requirements_html: cleanAiHtml(m[2]),
  };
}

export function cleanAiHtml(raw: string): string {
  return raw
    .replace(/```(?:html)?/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed)[^>]*>/gi, "")
    .trim();
}
