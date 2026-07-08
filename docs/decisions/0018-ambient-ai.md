# ADR 0018 — Ambient AI: kết quả đứng trước, nút chỉ để làm lại

**Ngày:** 2026-07-08 · **Người quyết định:** Sanh Võ · **Trạng thái:** Accepted

## Bối cảnh

Sau ADR 0017, app có ~10 điểm chạm AI. Một audit toàn bộ cho thấy hai nhóm:

- **Tự động (ambient):** chấm điểm CV, convert PDF→MD, prefill khi tải CV, backfill liên hệ.
- **Bấm-mới-chạy (click-to-use):** tóm tắt ứng viên (kết quả vứt đi sau khi rời trang), câu hỏi phỏng vấn (vứt đi), soạn JD/trọng số, soạn email, chatbot.

Chị Hương (low-tech) không chủ động bấm nút "AI". Kết quả bấm-mới-chạy còn không được lưu — mỗi người xem lại tốn một lượt gọi model.

## Quyết định (chỉ đạo Sanh 2026-07-08)

> "Don't put AI everywhere for user to click and use — make it run automatically, the user will see the result, change it or ask AI to do it again."

Nguyên tắc: **AI chạy nền ở thời điểm dữ liệu sẵn sàng, kết quả được LƯU và hiển thị sẵn; nút duy nhất là "làm lại".**

Áp dụng:

| Tính năng | Trước | Sau |
|---|---|---|
| Tóm tắt ứng viên | Nút "Tóm tắt AI", không lưu | `candidates.ai_summary(+_at)` — worker chấm điểm ghi `overall_summary` của pass 2 vào (KHÔNG tốn thêm lượt gọi AI); nút "Tóm tắt lại" đọc dossier đầy đủ và ghi đè (bản giàu hơn khi ứng viên đi sâu vào quy trình) |
| Câu hỏi phỏng vấn | Nút "Gợi ý câu hỏi", không lưu | `interviews.ai_questions(+_at)` — sinh tự động ngay khi đặt lịch (fire-and-forget `ctx.waitUntil`, core dùng chung `server/interviews/ai-questions.ts`); trang phỏng vấn hiện sẵn; nút "Tạo lại" |
| Chấm điểm CV / PDF→MD / prefill / backfill | Đã ambient | Giữ nguyên |

**Giữ thủ công (có chủ đích):** soạn JD + trọng số (luồng hiếm 1–3 vị trí/tháng, bản chất là trợ bút lúc soạn), soạn email trong composer (tùy chọn), chatbot (bản chất hội thoại).

## Hệ quả

- Migration 0005: 4 cột mới (`candidates.ai_summary/_at`, `interviews.ai_questions/_at`).
- waitUntil có trần ~30s — model reasoning có thể không kịp → UI luôn giữ nút "Tạo câu hỏi" làm đường lùi khi cột trống.
- Vệ sinh usage-tag: prefill tách thành `cv_prefill` (trước lẫn vào `candidate_summary`), gợi ý trọng số thành `weights_suggest` (trước lẫn vào `jd_generate`) — bảng thống kê ở `/cai-dat/he-thong` giờ đọc đúng.
- Ghi chú tồn đọng: `env.AI.toMarkdown` (convert PDF) KHÔNG đi qua `aiChat/aiJson` nên không có mặt trong `ai_usage_log` — chấp nhận (không có usage số liệu từ API này), ghi lại để khỏi tưởng là bug.
