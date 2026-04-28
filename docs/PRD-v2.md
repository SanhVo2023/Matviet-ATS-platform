# PRD v2.0 — Mắt Việt HR
## Hệ Thống Quản Lý Tuyển Dụng Thông Minh
### AI-Powered Hiring Management System

| Phiên bản | 2.0 |
|---|---|
| Ngày | 21/04/2026 |
| Tác giả | Sanh Võ |
| Đơn vị | Mắt Việt (Mat Viet Optical) |
| Trạng thái | Ready for Build — tất cả quyết định chiến lược đã chốt |
| Tài liệu liên quan | `mutable-crunching-coral.md` (technical build plan), `Infrastructure-and-Assets.md` (checklist hạ tầng) |
| Ngôn ngữ sản phẩm | **Tiếng Việt only** — không song ngữ |

---

## 1. Bối Cảnh & Lý Do Dự Án

Mắt Việt (chuỗi bán lẻ kính mắt) hiện vận hành quy trình tuyển dụng hoàn toàn thủ công: Excel để theo dõi, Outlook để liên lạc, OneDrive để lưu CV. Nhân sự HR duy nhất là **chị Bùi Thị Hương** (3 năm kinh nghiệm). Chị phỏng vấn nội bộ ngày 07/04/2026 đã nói trực tiếp:

> *"Tôi cần 1 phần mềm tiện lợi, dễ sử dụng, không mất nhiều thời gian. Đảm bảo chất lượng hồ sơ theo đúng tiêu chí tuyển dụng theo từng vị trí."*

Quy trình hiện tại: phòng ban đề xuất → xin headcount Tập đoàn → đăng tin TopCV → lọc CV trên web → tải về OneDrive → gửi email cho Trưởng phòng → set phỏng vấn → offer.

**Quy mô thực tế:**
- 1–3 vị trí tuyển mới/tháng
- 20–50 CV/vị trí
- 2–4 tuần time-to-hire
- <5 users sử dụng hệ thống
- ≤5 email gửi đi/ngày

**Các điểm đau HR xếp hạng:**
1. Tốn thời gian lọc CV thủ công (quan trọng nhất)
2. Không có cách đánh giá/so sánh ứng viên thống nhất
3. CV nằm rải rác nhiều nơi (OneDrive, email, web)
4. Khó báo cáo / thống kê cho lãnh đạo

## 2. Mục Tiêu Sản Phẩm

| # | Mục tiêu | Cách đo |
|---|---|---|
| G1 | Giảm 70% thời gian lọc CV bằng AI | So sánh thời gian lọc 50 CV tháng trước/tháng sau launch |
| G2 | Tập trung 100% CV từ mọi nguồn vào một hệ thống | Không còn OneDrive workflow sau 2 tuần dual-run |
| G3 | Tự động hóa toàn bộ email tuyển dụng | 0 email soạn thủ công từ đầu |
| G4 | Dashboard minh bạch cho lãnh đạo + Trưởng phòng | Báo cáo tự xuất hàng tháng không cần HR biên tập |
| G5 | Quy trình phê duyệt rõ ràng, có audit trail | 100% quyết định tuyển có log truy vết |

## 3. Đối Tượng Sử Dụng

| Vai trò | Người đại diện | Quyền chính |
|---|---|---|
| **Admin** | Sanh Võ | Toàn quyền: cấu hình hệ thống, quản lý user, xem audit |
| **HR Staff** | Chị Bùi Thị Hương | Đăng tin, lọc CV, lên lịch PV, gửi email, báo cáo |
| **Hiring Manager** | Trưởng phòng các bộ phận | Xem CV và ứng viên trong phòng ban mình, đánh giá PV, phê duyệt |
| **BOD / Tập đoàn** | Ban Giám đốc, Quản lý TĐ | Duyệt cuối (các vị trí cấp quản lý) |
| **Candidate** | Không có tài khoản | Tương tác qua email: nhận xác nhận CV, lời mời PV, bài test, offer |

## 4. Phạm Vi Sản Phẩm

### 4.1 Trong phạm vi (In Scope) — 11 FR đầy đủ, không cắt giảm

| ID | Tính năng | Mô tả |
|---|---|---|
| FR-01 | **Dashboard tổng quan** | Cards thống kê real-time, pipeline funnel, lịch PV hôm nay, chờ duyệt. Filter theo thời gian / phòng ban. |
| FR-02 | **Quản lý tin tuyển dụng** | CRUD JD chi tiết, weight editor, flow_type, status lifecycle (draft/open/paused/closed/filled). Nhiều vị trí đồng thời. |
| FR-03 | **Import CV đa nguồn** | Manual upload (PDF/DOCX), CSV import (CareerViet, TopCV export), email inbox poller (Microsoft Graph), TopCV API (Phase B), Giới thiệu nội bộ. |
| FR-04 | **AI CV Screening** | Gemini 2.5 Flash 2-pass: parse → score theo 6 tiêu chí với evidence quotes. Weight cấu hình theo vị trí. |
| FR-05 | **Pipeline ứng viên** | Dual view: Kanban (drag-drop) + bảng dạng Excel (HR yêu cầu). 8 giai đoạn. Bulk actions. |
| FR-06 | **Email tự động hybrid** | Microsoft Graph (hr@matviet.com.vn). Auto cho low-stakes (xác nhận, nhắc lịch); HR duyệt preview cho high-stakes (mời PV, offer, từ chối). React Email templates. |
| FR-07 | **Lịch phỏng vấn Outlook** | Graph Calendar event + Teams link tự động. Calendar + list view. Conflict detection. |
| FR-08 | **Form đánh giá phỏng vấn** | Form chuẩn hóa online: 6 tiêu chí + điểm mạnh/yếu + đề xuất lương + khuyến nghị. |
| FR-09 | **Quy trình phê duyệt 2 presets** | **Nhân viên**: HR+TP đề xuất → HR deal lương → Offer. **Quản lý**: HR+TP → BOD → Tập đoàn → Offer. Mỗi job chọn flow tại thời điểm tạo. |
| FR-10 | **Báo cáo & thống kê** | 6 charts: funnel, time-to-hire, nguồn CV hiệu quả, phân phối điểm AI, conversion giai đoạn, tuyển theo tháng. Xuất PDF + Excel. |
| FR-11 | **Quản lý bài test (v1 file upload)** | Upload test file/vị trí → gửi email link → nhận bài qua email → HR upload đáp án + chấm điểm. v2 (sau launch): Form builder drag-drop. |

### 4.2 Ngoài phạm vi (Out of Scope)

- Candidate portal (ứng viên KHÔNG đăng nhập — chỉ qua email)
- Payroll / quản lý lương
- Onboarding sau nhận việc
- Mobile native app (chỉ web responsive)
- VietnamWorks API (HR không xếp hạng là nguồn chính)
- Multi-ngôn ngữ (chỉ tiếng Việt)
- Candidate de-duplication tự động (v2)

## 5. Quyết Định Chiến Lược Đã Chốt (2026-04-21)

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| **Ngôn ngữ** | Tiếng Việt only | Công ty Việt Nam, user Việt, đơn giản hóa scope |
| **TopCV tích hợp** | Phase A: CSV + email forwarding (ship trước). Phase B: Real API sau khi xác nhận credentials với TopCV. | TopCV API có tồn tại (Base.vn chứng minh) nhưng không có public docs. Phase A không phụ thuộc bên ngoài → ship được. |
| **Line Manager access** | Full Supabase Auth login, role `hiring_manager`, scope theo phòng ban + job_assignments | Đơn giản bảo mật; manager cần xem nhiều thông tin, không phù hợp magic link một lần |
| **Email automation** | Hybrid auto + HR-approved. Build in-app (không dùng n8n/Zapier). Template editor embed. | 7 triggers là scope nhỏ — build from scratch tốn ~3 ngày, control tốt, tích hợp sâu với state machine + RLS |
| **Scoring weights** | Role-family templates (Sales / Kỹ thuật viên quang học / Văn phòng / Quản lý) + slider override theo job | Phù hợp rhythm 1-3 vị trí/tháng của HR |
| **Assessment** | v1 file upload + email. v2 (sau launch) full form builder. Schema đã reserved cho v2. | Match hiện trạng HR; không cần form builder ngay |
| **Approval flow** | 2 presets hardcoded (Staff 3 bước, Management 4 bước). Mỗi job chọn flow_type. | Rõ ràng, phù hợp với cách Mắt Việt vận hành hiện tại |
| **CV fairness** | KHÔNG strip PII (tuổi/giới/ảnh). Full raw CV vào Gemini. Log đầy đủ prompt + response. | HR quyết định; luật lao động VN không hạn chế; bỏ complexity không cần thiết |
| **Migration dữ liệu** | Fresh start. OneDrive giữ làm archive. | Giảm rủi ro migration; CV cũ thường stale |
| **Launch** | Soft launch: 1 vị trí thật chạy song song với Excel 2 tuần → cutover hoàn toàn | An toàn; có backup khi có bug |
| **IT coordination** | Có IT contact Mắt Việt, Sanh coordinate qua ticket | Azure AD, SPF/DKIM, shared mailbox cần IT quyền |

## 6. Tiêu Chí AI Chấm Điểm CV (theo ưu tiên HR xếp hạng)

| # | Tiêu chí | Trọng số mặc định (có thể điều chỉnh) |
|---|---|---|
| 1 | Ngành nghề phù hợp (industry_fit) | Cao nhất |
| 2 | Kỹ năng chuyên môn (professional_skills) | Cao |
| 3 | Kinh nghiệm làm việc (work_experience) | Trung bình-cao |
| 4 | Số năm kinh nghiệm (years_experience) | Trung bình |
| 5 | Trình độ học vấn (education) | Thấp-trung bình |
| 6 | Địa điểm làm việc (location) | Thấp |

**Mỗi tiêu chí 0-100 + evidence quotes trích nguyên văn từ CV.**  
**Weighted total:** `Σ (điểm tiêu chí × trọng số)`  
**Template mặc định theo role family** (HR tinh chỉnh khi tạo job):

| Template | industry_fit | skills | experience | years | education | location |
|---|---|---|---|---|---|---|
| Sales (bán hàng) | 0.20 | 0.20 | 0.20 | 0.15 | 0.10 | 0.15 |
| Kỹ thuật viên quang học | 0.25 | 0.30 | 0.15 | 0.10 | 0.15 | 0.05 |
| Văn phòng | 0.15 | 0.25 | 0.20 | 0.15 | 0.15 | 0.10 |
| Quản lý | 0.20 | 0.20 | 0.25 | 0.20 | 0.10 | 0.05 |

## 7. Yêu Cầu Chức Năng (Chi Tiết)

### FR-01 Dashboard
**User:** HR, Manager  
**Input:** user session, optional filters (date range, department)  
**Output:** 4 stat cards + pipeline funnel + today's interviews list + activity feed + pending approvals
**Acceptance:**
- Load <2s với dữ liệu 3 tháng
- Refresh tự động 60s
- Filter state sync với URL
- Empty states đúng cho user mới

### FR-02 Quản lý tin tuyển dụng
**Capabilities:**
- CRUD (draft → open → paused/closed/filled)
- Slide-over form 640px với 9 sections
- Weight editor 6 sliders, sum = 100%
- Duplicate job action
- Autosave drafts mỗi 5s
**Acceptance:**
- Tạo job mới trong <3 phút
- Weight validation real-time
- Status transitions có audit log

### FR-03 Import CV đa nguồn
**Sources đồng nhất vào `candidates` với field `source`:**
- `manual_upload`: drag-drop PDF/DOCX (tối đa 10MB/file)
- `email_inbox`: poller mỗi 5 phút quét hr@matviet.com.vn
- `csv_import`: TopCV/CareerViet employer export CSV với column mapper UI
- `topcv_api`: Phase B, sau khi confirm credentials
- `referral`: form nội bộ với link tới người giới thiệu
**Acceptance:**
- CV từ inbox xuất hiện trong app <10 phút
- Duplicate detection cảnh báo (không block): cùng email + số điện thoại
- CSV import preview trước khi confirm

### FR-04 AI CV Screening
**Pipeline:**
1. Nhận PDF (convert DOCX via libreoffice worker nếu cần)
2. Gemini Pass 1: parse cấu trúc JSON (personal, experience, education, skills...)
3. Gemini Pass 2: score 6 tiêu chí + evidence quotes + overall summary
4. Compute weighted total, persist to `ai_screenings` + denormalize vào `candidates.ai_score`
5. Trigger stage hook (new → screened) → auto receipt_ack email
**Acceptance:**
- <60s từ upload đến có score
- Evidence quotes khớp nguyên văn với CV (không hallucinate)
- Re-score button khi weights thay đổi
- Cost hiển thị trên settings/integrations (~$0.09/tháng ở scale hiện tại)

### FR-05 Pipeline
**8 giai đoạn:** Mới → Đang chấm → Đã chấm → Đã xếp lịch PV → Đã PV → Đã gửi test → Đã làm test → Đề xuất → Deal lương → BOD duyệt → Tập đoàn duyệt → Đã gửi offer → Đã nhận offer → Đã tuyển / Từ chối / Rút hồ sơ  
**Dual view:**
- Bảng Excel-style: sort, filter, bulk select, URL-shareable state
- Kanban: drag-drop, card hover preview, stage duration indicator  
**Bulk actions:** chuyển giai đoạn, gửi email, xuất CSV, xóa (admin)

### FR-06 Email tự động
**Hybrid model:**

| Template | Mode | Trigger |
|---|---|---|
| Xác nhận CV (receipt_ack) | Auto | Khi candidate được tạo + scored |
| Nhắc lịch PV 24h | Auto | 24h trước interview |
| Mời phỏng vấn | HR duyệt | Khi HR click "Gửi mời PV" sau schedule |
| Gửi bài test | Auto | Khi HR click "Gửi test" (implicit approval) |
| Offer | HR duyệt | Khi approval flow complete |
| Từ chối | HR duyệt | Khi HR move to `rejected` stage |
| Yêu cầu phê duyệt nội bộ | Auto | Khi approval step pending |

**Template editor:** Rich text với variable palette (`{{candidate_name}}`, `{{job_title}}`, etc.). Preview với sample data. `requires_approval` flag per template.

**Gửi qua:** Microsoft Graph `/users/hr@matviet.com.vn/sendMail`  
**Đọc inbox:** Polling mỗi 5 phút, filter `hasAttachments eq true and isRead eq false`  
**Threading:** `conversationId` tracking; candidate replies xuất hiện trong timeline

### FR-07 Lịch phỏng vấn
**Capabilities:**
- Pick candidate + interviewers + date/time + duration + type (in-person/phone/video)
- Auto Teams link nếu type=video
- Conflict detection trước khi save
- Outlook calendar là source of truth; app mirror qua `graph_event_id`
- Reschedule, cancel với notification tự động
**Acceptance:**
- Event xuất hiện trong Outlook của interviewer <30s
- Candidate nhận invite với link Teams (nếu video)
- 24h reminder fires đúng giờ

### FR-08 Form đánh giá phỏng vấn
**Fields:**
- 6 slider 0-100: Chuyên môn, Kỹ năng mềm, Kinh nghiệm liên quan, Phù hợp văn hóa, Tiềm năng phát triển, Thái độ
- Textarea: Điểm mạnh, Điểm cần cân nhắc
- Input: Mức lương đề xuất (₫)
- Radio: Khuyến nghị (Rất nên tuyển / Nên tuyển / Cân nhắc / Không tuyển)
- Textarea: Ghi chú nội bộ (HR-only)
**Acceptance:**
- Multi-interviewer: aggregate mean/min/max hiển thị
- Reviewer chỉ edit được form của mình

### FR-09 Quy trình phê duyệt
**Hai presets hardcoded:**

**Staff (Nhân viên) — 3 bước:**
1. HR + Trưởng phòng đề xuất (parallel)
2. HR deal lương với ứng viên
3. Gửi Offer

**Management (Quản lý) — 4 bước:**
1. HR + Trưởng phòng đề xuất
2. BOD duyệt
3. Quản lý Tập đoàn duyệt
4. Gửi Offer

**Mỗi bước:** auto email cho actor, approve/reject button + notes, audit log. Reject → về lại bước 1 với lý do.

### FR-10 Báo cáo & Thống kê
**6 charts:**
1. Phễu tuyển dụng (funnel)
2. Thời gian tuyển trung bình theo role family
3. Nguồn CV hiệu quả
4. Phân phối điểm AI
5. Conversion giai đoạn
6. Tuyển theo tháng (line chart)
**Export:** PDF (React-PDF) + Excel (exceljs), giữ filter active

### FR-11 Quản lý bài test (v1)
- Upload test file/job (Storage)
- "Gửi test" action: email với link download signed URL (48h hạn)
- Candidate reply qua email với file đáp án
- Inbox poller match `In-Reply-To` header → flag pending review
- HR upload submission + chấm điểm → cộng vào composite score

## 8. Yêu Cầu Phi Chức Năng

| ID | Yêu cầu | Tiêu chuẩn |
|---|---|---|
| NFR-01 | Hiệu suất | Trang load <2s. AI scoring <60s/CV. API response p95 <500ms. |
| NFR-02 | Bảo mật | Supabase RLS trên mọi bảng. HTTPS everywhere. Secrets trong env vars (không commit). Application Access Policy restrict MS Graph app to hr@matviet.com.vn only. |
| NFR-03 | Khả dụng | 99.5% uptime (Supabase + Netlify SLA). Monitoring qua Sentry + Better Stack. |
| NFR-04 | Responsive | Tối ưu laptop 13-15 inch (thiết bị chính HR). Hoạt động tablet. Mobile usable nhưng không priority. |
| NFR-05 | Ngôn ngữ | Tiếng Việt 100% UI, email, error messages. Be Vietnam Pro font (hỗ trợ đầy đủ dấu). |
| NFR-06 | Dữ liệu | Supabase Pro PITR (backup 2 phút 1 lần, giữ 7 ngày). Export CSV/Excel bất kỳ lúc nào. |
| NFR-07 | Dễ sử dụng | HR mới thành thạo sau 1 buổi training 2-3h. Không cần đọc manual cho happy path. |
| NFR-08 | Mở rộng | Schema support multi-department. Kiến trúc cho phép scale lên 10-20 users + 100-500 CV/tháng mà không rewrite. |
| NFR-09 | Accessibility | WCAG 2.1 AA. Axe-core pass. Keyboard fully accessible. `prefers-reduced-motion` respected. |
| NFR-10 | Email deliverability | SPF/DKIM/DMARC đầy đủ. Test gửi đến Gmail/Yahoo/Outlook đều vào inbox. |

## 9. Kiến Trúc Hệ Thống (Tóm Tắt)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Laptop]                                                         │
│     ↓ HTTPS                                                       │
│  [Netlify CDN + Scheduled Functions]                              │
│     ↓                                                             │
│  [Next.js 15 App Router]                                          │
│     ├─ UI: shadcn/ui + Tailwind + Framer Motion                   │
│     ├─ State: Zustand + React Query                               │
│     └─ API routes ───┬─→ [Supabase] (Postgres + Auth + Storage)   │
│                      ├─→ [Google Gemini 2.5 Flash]                │
│                      ├─→ [Microsoft Graph API] (hr@matviet.com.vn)│
│                      └─→ [LibreOffice Worker] (DOCX→PDF)          │
└──────────────────────────────────────────────────────────────────┘
```

**Tech stack:** Next.js 15, TypeScript, Supabase Pro (Singapore region), Gemini 2.5 Flash, Microsoft Graph v1.0, shadcn/ui, Framer Motion, Recharts, React Email, React Query v5, Zustand, Netlify, Fly.io (DOCX worker), Sentry, Better Stack.

Chi tiết: xem `mutable-crunching-coral.md` Parts IV-V.

## 10. UI/UX Principles

1. **Table-first** — HR quen Excel, bảng là UI chính (sort/filter/bulk)
2. **3-click rule** — tác vụ chính hoàn thành ≤3 click
3. **Minimal input** — dropdown và autofill thay cho text field
4. **Slide-over > Modal** cho form nhiều field
5. **Vietnamese-first** — ngôn ngữ đơn giản, tôn trọng, ngắn gọn
6. **Progressive disclosure** — ẩn chi tiết trong expand/tab, không bom thông tin
7. **Keyboard accessible** — ⌘K global search, go-to shortcuts (G+D, G+J...)
8. **One delight moment** — ScoreCard animation 800ms, còn lại flat và nhanh
9. **Empty states friendly** — illustration + CTA, không để user trống trải
10. **Progress > blocking** — autosave drafts, skeleton loaders, toast feedback

Chi tiết color palette, typography, spacing, animation tokens: xem `mutable-crunching-coral.md` Part II.

## 11. Thời Gian & Chi Phí

### 11.1 Chi phí phát triển
**35,000,000 VND** (solo dev + AI tools, 2 tháng effort):

| Phase | Nội dung | Chi phí |
|---|---|---|
| 1. Foundation | Setup, auth, database, UI base | 5,000,000 |
| 2. Core Features | Job posting, CV management, AI screening | 10,000,000 |
| 3. Automation | Email, calendar, source integrations | 8,000,000 |
| 4. Advanced | Approval flow, dashboard, reports | 6,000,000 |
| 5. Polish & Launch | Testing, deploy, optimization | 3,000,000 |
| Training & Docs | 2 buổi training + tài liệu Việt | 3,000,000 |
| Hỗ trợ sau launch | 1 tháng fix bugs + support | **Miễn phí** |

**Thanh toán:** 30% khởi công (10.5M) — 40% sau demo email automation (14M) — 30% sau training và bàn giao (10.5M).

### 11.2 Chi phí vận hành hàng tháng

| Dịch vụ | USD/tháng | VND/tháng | Ghi chú |
|---|---|---|---|
| Supabase Pro | $25 | ~625.000 | 8GB DB, 100GB storage |
| Netlify | $0 | 0 | Free tier đủ |
| Gemini 2.5 Flash | ~$0.10 | ~2.500 | 50-150 CV/tháng |
| MS Graph API | $0 | 0 | Đã có trong O365 license |
| Fly.io DOCX worker | $5 | ~125.000 | Tiny container |
| Custom domain (.vn) | $1 | ~25.000 | 12$/năm |
| Sentry | $0 | 0 | Free tier |
| **TỔNG** | **~$31** | **~775.000** | (Không tính TopCV package ~3M/6 tháng đã có) |

### 11.3 ROI
- Chi phí 35M một lần (vs 150-300M thuê agency, 80-150M freelance team, 3-8M/tháng SaaS)
- Hoàn vốn 5-12 tháng so với SaaS HR
- Tiết kiệm ~70% thời gian lọc CV (20-30 giờ/tháng ≈ 5-8M VND nhân sự)

## 12. Rủi Ro & Giảm Thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|
| TopCV API thay đổi / không cấp credentials | Trung bình | Phase A (CSV + email forwarding) không phụ thuộc; Phase B added as progressive upgrade |
| Gemini model deprecated | Thấp | Abstraction layer; có thể swap sang Gemini 1.5 Flash hoặc model khác |
| AI scoring không chính xác | Trung bình | HR review + điều chỉnh weights; evidence quotes transparent; HR có quyền override |
| SPF/DKIM chưa cấu hình → email vào spam | Cao nếu không làm | Ticket IT Week 1; verify mxtoolbox trước launch; test gửi đến Gmail/Yahoo |
| Azure AD admin consent delay | Trung bình | Escalate sớm Week 1; fallback IMAP/SMTP via MailProvider interface |
| HR không quen dùng | Thấp | UI bảng Excel-style; 2 buổi training; tài liệu Việt; 1 tháng support sau launch |
| Solo dev bị nghỉ/bận | Trung bình | Code sạch + docs + README runbook; có thể handover |
| Supabase pricing tăng | Thấp | Open-source core, có thể self-host nếu cần |
| Libreoffice worker down | Thấp | Reject DOCX upload với message "Vui lòng convert sang PDF" làm fallback |

## 13. Tiêu Chí Chấp Nhận (Definition of Done)

### 13.1 Mỗi feature module
- UI match design system (colors, typography, spacing)
- Copy tiếng Việt 100%, qua i18n table type-safe
- Loading / empty / error states đầy đủ
- Keyboard accessible + screen-reader labels
- Animation per §12 + respect `prefers-reduced-motion`
- RLS verified (cross-role tests)
- Unit tests cho pure logic + E2E happy path
- Sentry error boundary
- Audit log entries cho mutations
- Documented

### 13.2 Production launch
- 10 test scenarios E2E pass (§10 plan file)
- axe-core a11y clean trên 5 trang chính
- Load test scoring 100 CV <30s p95
- HR UAT thành công trên staging (1 job thật)
- Deliverability test 3 providers pass
- Production URL live tại hr.matviet.com.vn
- Sentry + Better Stack monitoring active
- User guide tiếng Việt hoàn thiện
- 2 buổi training với chị Hương hoàn thành
- Soft launch 2 tuần dual-run không có incident blocker

## 14. Phân Đoạn Phát Triển

Chi tiết dependency-sequenced build order (11 groups, không theo lịch cứng): xem `mutable-crunching-coral.md` Part IX.

Tổng quan:
- **Group 0 — Prerequisites** (hạ tầng IT, assets phải ready)
- **Group 1 — Foundation** (project scaffolding, schema, auth, layout)
- **Group 2 — Jobs + Candidates Core**
- **Group 3 — AI Scoring** (differentiator)
- **Group 4 — Email Infrastructure**
- **Group 5 — Calendar & Interviews**
- **Group 6 — Approval Flow**
- **Group 7 — Assessments v1**
- **Group 8 — CSV + Source Integrations**
- **Group 9 — Reports & Analytics**
- **Group 10 — Referrals + Dashboard + Polish**
- **Group 11 — Quality & Launch**

Mỗi group có Definition of Done rõ ràng và tests verify trước khi chuyển sang group tiếp theo.

## 15. Assets & Hạ Tầng Yêu Cầu

Chi tiết checklist actionable theo owner + deadline: xem `Infrastructure-and-Assets.md`.

Tóm tắt ownership:

| Owner | Deliverables | Thời hạn |
|---|---|---|
| **Mắt Việt IT** | Azure AD app, Application Access Policy, shared mailbox hr@ | Trước Group 4 |
| **DNS Admin** | SPF, DKIM, DMARC records trên matviet.com.vn | Trước Group 4 |
| **Sanh Võ** | Supabase project, Netlify, Gemini billing, domain, LibreOffice worker, logo & assets | Trước Group 1 |
| **Designer** (Sanh hoặc freelance) | Logo (3 variants), favicon, OG image, 4 empty-state illustrations | Trước Group 1 |
| **TopCV vendor** | API credentials + docs | Sau launch (Phase B) |

## 16. Phê Duyệt

| Người lập | Người phê duyệt |
|---|---|
| Sanh Võ | _______________ |
| Developer / Project Owner | Ban Giám Đốc Mắt Việt |

---

**— End of PRD v2.0 —**

*Tài liệu liên quan:*
- `mutable-crunching-coral.md` — Technical build plan đầy đủ (schema, RLS, API, integrations, UI specs)
- `Infrastructure-and-Assets.md` — Checklist chuẩn bị hạ tầng + assets trước khi build
