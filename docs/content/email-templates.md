# Email Templates (Vietnamese)

**Status:** Approved (2026-04-28)
**Approver:** Sanh Võ on behalf of HR; chị Hương final spot-check before Group 6 seeds these into `email_templates` table via migration `0007_seed_defaults.sql`.

**Variables:** Handlebars-style `{{var_name}}`. Available variables per template noted at top of each section.

---

## 1. `receipt_ack` — Xác nhận đã nhận CV

- **Loại:** Tự động (gửi ngay khi candidate được tạo + scoring xong)
- **Variables:** `{{candidate_name}}`, `{{job_title}}`, `{{company_name}}`
- **Subject:** `Mắt Việt đã nhận hồ sơ của bạn — {{job_title}}`

```
Chào {{candidate_name}},

Cảm ơn bạn đã quan tâm đến vị trí "{{job_title}}" tại Mắt Việt.

Chúng tôi đã nhận được hồ sơ của bạn và đang trong quá trình xem xét.
Nếu hồ sơ phù hợp với yêu cầu vị trí, chúng tôi sẽ liên hệ với bạn
trong vòng 7-10 ngày làm việc để sắp xếp buổi phỏng vấn.

Trong thời gian chờ đợi, nếu bạn có câu hỏi, vui lòng phản hồi
email này.

Trân trọng,
Phòng Nhân sự
{{company_name}}
hr@matviet.com.vn
```

---

## 2. `interview_invite` — Thư mời phỏng vấn

- **Loại:** HR duyệt trước khi gửi (`requires_approval=true`)
- **Variables:** `{{candidate_name}}`, `{{job_title}}`, `{{interview_datetime}}`, `{{interview_type}}` (Trực tiếp / Online qua Teams / Điện thoại), `{{location_or_link}}`, `{{interviewer_name}}`, `{{duration_minutes}}`, `{{company_name}}`, `{{additional_notes}}`
- **Subject:** `Thư mời phỏng vấn — Vị trí {{job_title}} tại Mắt Việt`

```
Chào {{candidate_name}},

Cảm ơn bạn đã ứng tuyển vào vị trí "{{job_title}}" tại Mắt Việt.

Sau khi xem xét hồ sơ, chúng tôi rất muốn được trao đổi trực tiếp
với bạn. Vui lòng tham gia buổi phỏng vấn theo thông tin sau:

  Thời gian: {{interview_datetime}}
  Thời lượng dự kiến: {{duration_minutes}} phút
  Hình thức: {{interview_type}}
  Địa điểm / Link: {{location_or_link}}
  Người phỏng vấn: {{interviewer_name}}

{{additional_notes}}

Vui lòng phản hồi email này để xác nhận tham gia. Nếu thời gian
trên không phù hợp, hãy đề xuất 2-3 khung giờ khác để chúng tôi
sắp xếp lại.

Mong được gặp bạn,
Phòng Nhân sự
{{company_name}}
hr@matviet.com.vn
```

---

## 3. `interview_reminder_24h` — Nhắc lịch phỏng vấn (24h trước)

- **Loại:** Tự động (cron 24h trước scheduled_at)
- **Variables:** `{{candidate_name}}`, `{{job_title}}`, `{{interview_datetime}}`, `{{interview_type}}`, `{{location_or_link}}`, `{{interviewer_name}}`, `{{company_name}}`
- **Subject:** `Nhắc lịch phỏng vấn ngày mai — {{job_title}}`

```
Chào {{candidate_name}},

Đây là email nhắc lịch phỏng vấn ngày mai cho vị trí "{{job_title}}":

  Thời gian: {{interview_datetime}}
  Hình thức: {{interview_type}}
  Địa điểm / Link: {{location_or_link}}
  Người phỏng vấn: {{interviewer_name}}

Vui lòng chuẩn bị:
- CMND/CCCD bản gốc (nếu phỏng vấn trực tiếp)
- Các giấy tờ chứng minh kinh nghiệm (nếu có)
- Câu hỏi bạn muốn trao đổi với chúng tôi

Nếu có thay đổi đột xuất, hãy phản hồi email này hoặc gọi
hotline HR ngay.

Hẹn gặp bạn ngày mai,
Phòng Nhân sự
{{company_name}}
hr@matviet.com.vn
```

---

## 4. `assessment_send` — Gửi bài test

- **Loại:** Tự động khi HR click "Gửi test" (implicit approval)
- **Variables:** `{{candidate_name}}`, `{{job_title}}`, `{{test_title}}`, `{{test_link}}`, `{{deadline}}`, `{{instructions}}`, `{{company_name}}`
- **Subject:** `Bài test cho vị trí {{job_title}} — Mắt Việt`

```
Chào {{candidate_name}},

Vui lòng hoàn thành bài test sau đây như một phần của quy trình
tuyển dụng cho vị trí "{{job_title}}":

  Tên bài test: {{test_title}}
  Hạn nộp: {{deadline}}
  Link tải đề: {{test_link}}

Hướng dẫn:
{{instructions}}

Cách nộp bài:
Vui lòng phản hồi email này (Reply) và đính kèm file đáp án
(định dạng PDF hoặc DOCX). Tuyệt đối không chuyển tiếp link
cho người khác.

Nếu có thắc mắc về đề bài, hãy phản hồi email này trong vòng
24 giờ đầu.

Chúc bạn làm bài tốt,
Phòng Nhân sự
{{company_name}}
hr@matviet.com.vn
```

---

## 5. `offer` — Thư mời nhận việc

- **Loại:** HR duyệt trước khi gửi (`requires_approval=true`)
- **Variables:** `{{candidate_name}}`, `{{job_title}}`, `{{department}}`, `{{salary_offered}}`, `{{start_date}}`, `{{probation_period}}`, `{{benefits_summary}}`, `{{response_deadline}}`, `{{company_name}}`
- **Subject:** `Thư mời nhận việc — Vị trí {{job_title}} tại Mắt Việt`

```
Chào {{candidate_name}},

Sau quá trình tuyển dụng, Mắt Việt rất vui mừng được đề nghị
bạn vị trí "{{job_title}}" tại {{department}}.

Thông tin chi tiết:

  Vị trí:           {{job_title}}
  Phòng ban:        {{department}}
  Mức lương:        {{salary_offered}}
  Ngày dự kiến nhận việc: {{start_date}}
  Thời gian thử việc: {{probation_period}}

Phúc lợi:
{{benefits_summary}}

Để xác nhận chấp thuận đề nghị, vui lòng phản hồi email này
trước {{response_deadline}}. Sau khi xác nhận, chúng tôi sẽ
hướng dẫn các bước tiếp theo (ký hợp đồng, hồ sơ nhân sự,
onboarding).

Nếu có điểm cần trao đổi thêm về điều khoản, vui lòng phản hồi
email và HR sẽ liên hệ với bạn.

Chào mừng đến với đại gia đình Mắt Việt!

Trân trọng,
Phòng Nhân sự
{{company_name}}
hr@matviet.com.vn
```

---

## 6. `rejection` — Thông báo kết quả (Không phù hợp)

- **Loại:** HR duyệt trước khi gửi (`requires_approval=true`); có ô tùy chọn cá nhân hóa
- **Variables:** `{{candidate_name}}`, `{{job_title}}`, `{{company_name}}`, `{{personalized_note}}` (HR có thể bỏ trống)
- **Subject:** `Cảm ơn bạn đã quan tâm đến Mắt Việt`

```
Chào {{candidate_name}},

Cảm ơn bạn đã dành thời gian ứng tuyển vào vị trí "{{job_title}}"
và tham gia quy trình tuyển dụng của Mắt Việt.

Sau quá trình xem xét, chúng tôi rất tiếc phải thông báo rằng
hồ sơ của bạn chưa thực sự phù hợp với yêu cầu của vị trí
này lần này.

{{personalized_note}}

Chúng tôi đánh giá cao nỗ lực của bạn và sẽ lưu hồ sơ trong
hệ thống. Khi có vị trí phù hợp hơn trong tương lai, chúng tôi
sẽ chủ động liên hệ.

Chúc bạn nhanh chóng tìm được cơ hội nghề nghiệp như mong muốn.

Trân trọng,
Phòng Nhân sự
{{company_name}}
hr@matviet.com.vn
```

---

## 7. `approval_request` — Yêu cầu duyệt (nội bộ, gửi cho người duyệt)

- **Loại:** Tự động khi approval step pending
- **Variables:** `{{approver_name}}`, `{{candidate_name}}`, `{{job_title}}`, `{{step_label}}`, `{{candidate_link}}`, `{{ai_score}}`, `{{deadline}}` (optional)
- **Subject:** `Cần duyệt: {{candidate_name}} — Vị trí {{job_title}}`

```
Chào {{approver_name}},

Có một ứng viên cần duyệt qua bước "{{step_label}}":

  Ứng viên:  {{candidate_name}}
  Vị trí:    {{job_title}}
  Điểm AI:   {{ai_score}}/100

Vui lòng xem chi tiết và quyết định tại:
{{candidate_link}}

{{#if deadline}}Hạn xử lý: {{deadline}}{{/if}}

Cảm ơn bạn,
Mắt Việt HR System
```

---

## Common variables reference

| Variable | Source | Example |
|---|---|---|
| `{{candidate_name}}` | `candidates.full_name` | `Nguyễn Văn A` |
| `{{job_title}}` | `jobs.title` | `Nhân viên bán hàng` |
| `{{department}}` | `departments.name` (via job) | `Bán hàng` |
| `{{interview_datetime}}` | `interviews.scheduled_at` formatted vi-VN | `14:00 thứ Năm, 30/04/2026` |
| `{{interview_type}}` | `interviews.type` mapped to VN | `Online qua Microsoft Teams` |
| `{{location_or_link}}` | `interviews.meeting_url` or `location` | `https://teams.microsoft.com/...` |
| `{{interviewer_name}}` | joined from `interview_interviewers` | `Anh Trần Văn B` |
| `{{duration_minutes}}` | `interviews.duration_minutes` | `60` |
| `{{salary_offered}}` | currency-formatted vi-VN | `15.000.000 ₫` |
| `{{ai_score}}` | `candidates.ai_score` rounded | `82` |
| `{{candidate_link}}` | absolute URL | `https://hr.matviet.com.vn/candidates/<id>` |
| `{{company_name}}` | constant | `Mắt Việt` |

---

## Open follow-ups (post-approval refinements; not blocking Group 1-5)

- [ ] Chị Hương final tone spot-check before Group 6 build (last gate before seeding into DB)
- [ ] Possible additional templates to add later: dời lịch phỏng vấn, hủy phỏng vấn, gửi link feedback
- [ ] `{{benefits_summary}}` (offer letter) — decide if template-per-department or free-text
- [ ] `{{personalized_note}}` (rejection) — author 3-5 reusable rejection-reason snippets HR can choose from
