import type { Database } from "@/types/db";

type UserRole = Database["public"]["Enums"]["user_role"];

export interface HelpSection {
  title: string;
  steps: string[];
}

/** Role-scoped in-app SOP (renovation R3) — the first user-facing help the
 * app has ever had. Kept short and task-shaped, not a manual. */
export const HELP_BY_ROLE: Record<UserRole, HelpSection[]> = {
  hr: [
    {
      title: "Quy trình hằng ngày",
      steps: [
        "Mở Tổng quan: khối 'Hôm nay cần làm' liệt kê mọi việc đang chờ bạn.",
        "Duyệt các đề xuất của Trợ lý AI (đặt lịch, trình duyệt, nhắc việc) chỉ với một chạm.",
        "Tải CV mới trong Ứng viên — AI tự chấm điểm trong 1–2 phút.",
      ],
    },
    {
      title: "Xử lý ứng viên",
      steps: [
        "Mỗi thẻ ứng viên hiển thị đang chờ AI, chờ ứng viên, hay chờ bạn — và đã chờ bao nhiêu ngày.",
        "Kéo thẻ trên bảng để chuyển giai đoạn; thả vào cột 'Đề nghị làm việc' để bắt đầu chuỗi duyệt.",
        "Khi từ chối, hãy chọn lý do để báo cáo phản ánh đúng (sàng lọc, không duyệt, ứng viên từ chối…).",
      ],
    },
  ],
  admin: [
    {
      title: "Quản trị hệ thống",
      steps: [
        "Cài đặt → Người dùng: tạo tài khoản (gửi email chào mừng), đặt lại mật khẩu, vô hiệu hóa.",
        "Cài đặt → Hệ thống: chọn model AI, bật/tắt AI, xem chi phí, chạy hàng đợi thủ công.",
        "Nhật ký: xem lại thao tác của Trợ lý AI và quản trị người dùng.",
      ],
    },
  ],
  hiring_manager: [
    {
      title: "Việc của Trưởng phòng",
      steps: [
        "Phỏng vấn → tab 'Chờ đánh giá': nhập đánh giá cho các buổi đã phỏng vấn.",
        "Phê duyệt: duyệt hoặc từ chối bước 'Trưởng phòng đề xuất' ngay trên điện thoại.",
        "Bạn chỉ thấy ứng viên thuộc các vị trí được phân công.",
      ],
    },
  ],
  bod: [
    {
      title: "Phê duyệt cấp BOD",
      steps: [
        "Trang chủ hiển thị các hồ sơ đang chờ bạn — kèm điểm AI, kết quả phỏng vấn và đề xuất lương.",
        "Bấm 'Duyệt' hoặc 'Từ chối' (kèm lý do) ngay trên thẻ.",
        "Bấm 'Xem đầy đủ' để mở hồ sơ chi tiết (chỉ đọc) nếu cần thêm thông tin.",
      ],
    },
  ],
  tap_doan: [
    {
      title: "Phê duyệt cấp Tập đoàn",
      steps: [
        "Trang chủ hiển thị các hồ sơ đang chờ bạn — kèm điểm AI, kết quả phỏng vấn và đề xuất lương.",
        "Bấm 'Duyệt' hoặc 'Từ chối' (kèm lý do) ngay trên thẻ.",
        "Bấm 'Xem đầy đủ' để mở hồ sơ chi tiết (chỉ đọc) nếu cần thêm thông tin.",
      ],
    },
  ],
};
