# ADR 0019 — Trang ứng viên là CÁI THANG + một ngôn ngữ giai đoạn cho toàn app

**Ngày:** 2026-07-08 · **Người quyết định:** Sanh Võ · **Trạng thái:** Accepted

## Bối cảnh

Sanh yêu cầu thiết kế lại trang ứng viên từ đầu: Trưởng phòng phải NHÌN LƯỚT là thấy (a) ứng viên làm bài thế nào, (b) đang ở đâu, (c) mình cần làm gì; trực quan là ưu tiên số 1; quy trình tuyển giống leo thang; trạng thái ứng viên phải nhất quán trên mọi trang.

Audit trước khi làm phát hiện:
- **3 bộ từ vựng giai đoạn song song:** badge 16 màu riêng (`StageBadge`), nhóm-4-cột + chấm sẵn sàng (kanban), và bảng nhãn 7 nhóm riêng của funnel báo cáo. Hai bản đồ màu readiness ở KanbanCard và CandidateHeader đã **lệch nhau** (drift thật).
- Trang ứng viên **không hề fetch đánh giá phỏng vấn** — kết quả quan trọng nhất với Trưởng phòng ("2/2 đề xuất tuyển") không được hiển thị ở đâu ngoài từng trang phỏng vấn.

## Quyết định (chốt qua debate 2026-07-08)

1. **Cái thang LÀ trang** (concept C): cột chính của trang ứng viên là 4 nấc thang dọc (đúng 4 nhóm nghiệp vụ của kanban). Nấc đã qua = 1 dòng KẾT QUẢ (bấm mở chi tiết tại chỗ); nấc hiện tại = mở sẵn, chứa nội dung + **thanh hành động theo giai đoạn** (`lib/next-actions.ts` — một nút chính hiển nhiên); nấc tương lai = mờ. Ứng viên đóng (từ chối/rút lui) hiện dải "Kết thúc tại đây" ở nấc họ rơi khỏi thang.
2. **Một ngôn ngữ giai đoạn** — `lib/stage-visuals.ts` là nguồn duy nhất cho màu nhóm (GROUP_TINT/ACCENT), chấm + chữ readiness (READINESS_DOT/TEXT), và băng điểm AI (scoreVerdict). `StageBadge` đổi sang icon nhóm + nhãn chi tiết + màu nhóm + chấm readiness — bảng /ung-vien, dashboard, timeline, StageDropdown tự đồng bộ với kanban và thang.
3. **Tài liệu tham khảo tách khỏi quy trình:** liên hệ / CV / ghi chú / email nằm ở rail phải; PDF và lịch sử email mở bằng SlideOver. iframe PDF gắn `#navpanes=0&pagemode=none` — chỉ hiện trang PDF, không sidebar thumbnail (yêu cầu Sanh).
4. Dữ liệu mới: `listEvaluationsForCandidate` (join interviews ⋈ interview_evaluations) — digest "n/t đề xuất tuyển" + điểm mạnh/cân nhắc/lương đề xuất của từng người phỏng vấn hiện ngay trên nấc 2.

## Ngoại lệ có chủ đích

- **Funnel báo cáo giữ 7 nhóm phân tích riêng** (`STAGE_TO_SUPER`) — mục đích thống kê khác mục đích vận hành; nhưng nhãn stage chi tiết của nó nay dùng chung `t.stage` (xóa bản sao đã drift).
- DB vẫn giữ nguyên 16 stage chi tiết; StageDropdown ở header là lối thoát chỉnh tay mọi stage.

## Hệ quả / dọn dẹp

- RETIRED: `CandidateTabs`, `CandidateTimeline` (sự kiện chuyển vào từng nấc — "Diễn biến"), `CvPreview`, `ApprovalProgress` (thanh tiến độ gộp vào nấc 3).
- Header ứng viên thu gọn (tên + điểm + vị trí + StageDropdown) — stepper ngang bỏ, thay bằng chính cái thang.
- Hành động nằm ĐÚNG MỘT chỗ: nấc hiện tại (schedule/đề xuất/xác nhận tuyển/từ chối 2-bước); các hành động chuyên biệt vẫn ở khối nội dung của chúng (retry chấm AI, gửi test, duyệt từng bước, soạn offer).
