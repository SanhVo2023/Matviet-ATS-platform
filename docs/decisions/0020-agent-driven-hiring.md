# ADR 0020 — Tuyển dụng do agent điều phối, propose-first (HiringAgent DO + feed "Hôm nay" + command bar)

**Ngày:** 2026-07-16 · **Người quyết định:** Sanh Võ · **Trạng thái:** Accepted

## Bối cảnh

Chỉ đạo của Sanh (2026-07-16): "reimagine" ứng dụng — giảm mạnh lượng nhập liệu,
chuyển từ CRUD-có-nút-AI sang **quy trình do agent điều phối** với lớp quản
trị/hiển thị truyền thống giữ nguyên; tận dụng tối đa hạ tầng agent của
Cloudflare (Agents SDK); "giấu dây điện, chỉ cho người dùng thấy thứ tối giản".

Audit trước khi làm: app đã có agent 24 công cụ (`server/ai/agent.ts`) nhưng
**thụ động** (chỉ chạy khi người dùng mở chat); AI ambient đã phủ các trường
nặng (JD, trọng số, email, CV-prefill); các notification emitter là trigger
làm sẵn. Cái thiếu không phải AI — là việc **con người vẫn phải khởi xướng
từng bước**.

## Quyết định (chốt qua brainstorm 2026-07-16)

1. **Propose-first (mức tự chủ):** agent CHUẨN BỊ mọi thứ (thư nháp, khung giờ,
   digest đánh giá) nhưng mọi hành động hướng ngoại/đổi trạng thái đều chờ
   một chạm Duyệt. Nới mức tự chủ sau, theo từng loại hành động.
2. **Kiến trúc: Agents SDK — một Durable Object `HiringAgent` cho MỖI vị trí**
   (binding `HIRING_AGENT`, class export từ `custom-worker.ts`).
   - **D1 vẫn là hệ thống hồ sơ duy nhất.** DO chỉ giữ state điều phối
     (watch + timer từng ứng viên) — mất cũng không sao, event kế tiếp arm lại.
   - **DO không chạy business logic** (không đọc D1, không gọi AI): alarm bắn
     về app qua **service binding `SELF`** → `/api/agent/sweep`
     (Bearer CRON_SECRET — đúng pattern cron drain có sẵn).
   - **Phía Next KHÔNG import gói `agents`** (webpack không bundle được
     `cloudflare:*`): emitter nói chuyện với DO qua raw stub fetch +
     `onRequest` nội bộ (`agent-flows/agent-link.ts`).
3. **Đầu ra của agent = bảng `agent_proposals`** (migration 0006): mỗi dòng là
   một hành động ĐÃ CHUẨN BỊ ĐẦY ĐỦ (payload) + 1 câu tóm tắt + "Vì sao?".
   Dedupe bằng `dedupe_key`; đổi giai đoạn → supersede thẻ không còn hợp.
4. **Feed "Hôm nay" trên dashboard HR** (trên action inbox ADR 0015): thẻ =
   icon nhóm + tóm tắt + chi tiết mở rộng + [Duyệt] [Bỏ qua]. **Duyệt chạy
   ĐÚNG các server service mà thao tác tay vẫn dùng**, audit
   `via:'agent_proposal'`.
5. **5 loại đề xuất v1** — 4 loại ĐẦU KHÔNG GỌI AI (lắp từ dữ liệu có sẵn):
   `interview_invite` (điểm ≥55 → 3 khung giờ từ free/busy Outlook, fallback
   giờ hành chính + thư mời), `start_approval` (digest "n/t đề xuất tuyển"),
   `compose_offer` (mở composer; thẻ tự đóng khi thư offer vào queue),
   `nudge_stale` (timer DO → email nhắc ứng viên hoặc chuông nội bộ),
   `job_from_intent` (loại DUY NHẤT sinh nội dung: 1 câu lệnh → parse +
   JD qua core chung `server/jobs/ai-content.ts` + trọng số theo mẫu).
6. **Command bar:** AgentDock thăng cấp — Ctrl/Cmd+K toàn cục, tool mới
   `draft_job_from_intent` (tạo THẺ đề xuất, không cần màn xác nhận trong
   chat — thẻ chính là bước duyệt).

## Không làm ở v1 (dời phase sau)

- **Email inbound từ ứng viên** (agent thương lượng lịch qua reply) — cần MX
  subdomain; zone gốc matviet.com.vn là Google Workspace, KHÔNG đụng.
- Live-sync WebSocket (`useAgent`) cho feed — v1 dùng revalidate + bell poll.
- Weekly digest; nâng mức tự chủ theo loại hành động.

## Hệ quả

- `npm i agents` kéo theo **zod 3→4** (peer bắt buộc) + `@hookform/resolvers`
  5; `@stylexjs/stylex` thành dep tường minh; `.npmrc legacy-peer-deps=true`
  (peer vite tùy chọn của agents xung đột vitest).
- Stage semantics (ngưỡng stale, điểm sàn 55) sống ở `agent-flows/events.ts`,
  không ở DO. Test hook `AGENT_STALE_OVERRIDE_SECONDS` + `/api/agent/ping`.
- Notification type mới `agent_proposal`.
