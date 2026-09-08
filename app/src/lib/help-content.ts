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
    {
      title: "Nhân sự & nghỉ phép",
      steps: [
        "Xác nhận tuyển → hồ sơ nhân viên được tạo tự động từ ứng viên (cùng một hồ sơ cá nhân). Mở từ nấc 'Nhận việc' hoặc trong Nhân viên.",
        "Trợ lý AI nhắc hết thử việc, hết hạn hợp đồng và bộ hồ sơ nhận việc trong 'Hôm nay' — duyệt đề xuất thay vì tự dò lịch.",
        "Nghỉ phép: tạo đơn thay nhân viên; hệ thống tính số dư phép và báo trùng lịch trong phòng. Duyệt hoặc từ chối (kèm ghi chú) một chạm.",
        "Thông báo & Tài liệu: ghim thông báo quan trọng, tải quy chế/biểu mẫu để toàn công ty xem.",
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
    {
      title: "Nhân sự phòng bạn",
      steps: [
        "Nghỉ phép: xem và duyệt đơn nghỉ của nhân viên trong phòng — có cảnh báo nếu trùng lịch với đồng nghiệp.",
        "Đề xuất về nhân viên trong phòng (hết thử việc, gia hạn hợp đồng) hiện trong 'Hôm nay' trên trang chủ — chỉ cần một chạm.",
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
