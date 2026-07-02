-- Migration 0001 (D1) — Seed defaults: weight templates, email templates, departments
--
-- Ported from supabase/migrations/0010_seed_defaults.sql (Postgres) to SQLite:
--   * gen_random_uuid() → hardcoded stable UUIDv4 literals (fine for seed rows)
--   * `on conflict … do update` upserts → INSERT OR IGNORE (unique indexes on
--     weight_templates.family / email_templates.code / departments.code)
--   * jsonb → TEXT with valid JSON
--   * booleans → 1/0
--   * now() → strftime ISO-8601 UTC (matches app-side timestamp convention)
--   * auth/profiles/RLS parts of the old migration chain are skipped — better-auth owns users
--
-- =============== weight_templates (4 role families per PRD §6) ===============
INSERT OR IGNORE INTO weight_templates (id, family, name_vi, weights, is_default, updated_at) VALUES
  ('00000000-0000-4000-8000-000000000101', 'sales', 'Sales (bán hàng)',
   '{"industry_fit":0.20,"professional_skills":0.20,"work_experience":0.20,"years_experience":0.15,"education":0.10,"location":0.15}',
   0, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('00000000-0000-4000-8000-000000000102', 'optician', 'Kỹ thuật viên quang học',
   '{"industry_fit":0.25,"professional_skills":0.30,"work_experience":0.15,"years_experience":0.10,"education":0.15,"location":0.05}',
   0, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('00000000-0000-4000-8000-000000000103', 'office', 'Văn phòng',
   '{"industry_fit":0.15,"professional_skills":0.25,"work_experience":0.20,"years_experience":0.15,"education":0.15,"location":0.10}',
   0, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('00000000-0000-4000-8000-000000000104', 'manager', 'Quản lý',
   '{"industry_fit":0.20,"professional_skills":0.20,"work_experience":0.25,"years_experience":0.20,"education":0.10,"location":0.05}',
   0, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
--> statement-breakpoint

-- =============== email_templates (7 defaults per PRD FR-06) ===============
INSERT OR IGNORE INTO email_templates (id, code, name_vi, subject_vi, body_html, variables, requires_approval, is_active, created_at, updated_at) VALUES
  ('00000000-0000-4000-8000-000000000201', 'receipt_ack', 'Xác nhận đã nhận CV',
   'Cảm ơn bạn đã ứng tuyển vị trí {{job_title}} tại Mắt Việt',
   '<p>Kính gửi {{candidate_name}},</p><p>Mắt Việt xin xác nhận đã nhận hồ sơ ứng tuyển vị trí <strong>{{job_title}}</strong> của bạn. Chúng tôi sẽ xem xét và phản hồi trong vòng 5 ngày làm việc.</p><p>Trân trọng,<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title"]', 0, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  ('00000000-0000-4000-8000-000000000202', 'interview_invite', 'Lời mời phỏng vấn',
   'Lời mời phỏng vấn vị trí {{job_title}} — Mắt Việt',
   '<p>Kính gửi {{candidate_name}},</p><p>Mắt Việt trân trọng mời bạn tham dự buổi phỏng vấn cho vị trí <strong>{{job_title}}</strong>.</p><ul><li><strong>Thời gian:</strong> {{interview_time}}</li><li><strong>Địa điểm / Hình thức:</strong> {{interview_location}}</li><li><strong>Người phỏng vấn:</strong> {{interviewers}}</li></ul><p>Vui lòng phản hồi email này để xác nhận. Nếu cần dời lịch, xin báo trước 24 giờ.</p><p>Trân trọng,<br/>{{hr_name}}<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title","interview_time","interview_location","interviewers","hr_name"]', 1, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  ('00000000-0000-4000-8000-000000000203', 'interview_reminder_24h', 'Nhắc lịch phỏng vấn 24h',
   'Nhắc lịch phỏng vấn ngày mai — {{job_title}}',
   '<p>Kính gửi {{candidate_name}},</p><p>Đây là email nhắc lịch buổi phỏng vấn vị trí <strong>{{job_title}}</strong> sẽ diễn ra vào <strong>{{interview_time}}</strong> tại {{interview_location}}.</p><p>Hẹn gặp bạn!</p><p>Trân trọng,<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title","interview_time","interview_location"]', 0, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  ('00000000-0000-4000-8000-000000000204', 'assessment_send', 'Gửi bài test',
   'Bài kiểm tra cho vị trí {{job_title}}',
   '<p>Kính gửi {{candidate_name}},</p><p>Cảm ơn bạn đã hoàn tất vòng phỏng vấn. Để tiếp tục quy trình, mời bạn hoàn thành bài kiểm tra cho vị trí <strong>{{job_title}}</strong>.</p><p><a href="{{download_link}}">Tải đề bài tại đây</a> (link có hiệu lực 48 giờ)</p><p>Vui lòng gửi bài làm dưới dạng đính kèm trả lời email này trong vòng <strong>{{time_limit}}</strong>.</p><p>Trân trọng,<br/>{{hr_name}}<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title","download_link","time_limit","hr_name"]', 0, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  ('00000000-0000-4000-8000-000000000205', 'offer', 'Thư mời nhận việc',
   'Thư mời nhận việc — vị trí {{job_title}} tại Mắt Việt',
   '<p>Kính gửi {{candidate_name}},</p><p>Mắt Việt rất vui mừng gửi đến bạn lời mời chính thức cho vị trí <strong>{{job_title}}</strong>.</p><ul><li><strong>Mức lương:</strong> {{salary}}</li><li><strong>Ngày bắt đầu:</strong> {{start_date}}</li><li><strong>Phòng ban:</strong> {{department}}</li></ul><p>Vui lòng phản hồi xác nhận trước {{deadline}}.</p><p>Chào mừng bạn gia nhập đội ngũ Mắt Việt!</p><p>Trân trọng,<br/>{{hr_name}}<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title","salary","start_date","department","deadline","hr_name"]', 1, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  ('00000000-0000-4000-8000-000000000206', 'rejection', 'Thư cảm ơn (không phù hợp)',
   'Phản hồi đơn ứng tuyển vị trí {{job_title}}',
   '<p>Kính gửi {{candidate_name}},</p><p>Cảm ơn bạn đã quan tâm và dành thời gian ứng tuyển vào vị trí <strong>{{job_title}}</strong> tại Mắt Việt.</p><p>Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc thông báo bạn chưa phù hợp với vị trí lần này. Chúng tôi sẽ lưu hồ sơ và liên hệ lại nếu có cơ hội phù hợp hơn trong tương lai.</p><p>Chúc bạn thành công trên con đường nghề nghiệp.</p><p>Trân trọng,<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title"]', 1, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),

  ('00000000-0000-4000-8000-000000000207', 'internal_approval_request', 'Yêu cầu phê duyệt nội bộ',
   '[Phê duyệt] {{candidate_name}} — {{job_title}} — bước {{step_label}}',
   '<p>Xin chào {{actor_name}},</p><p>Có một yêu cầu phê duyệt cần xử lý:</p><ul><li><strong>Ứng viên:</strong> {{candidate_name}}</li><li><strong>Vị trí:</strong> {{job_title}}</li><li><strong>Bước:</strong> {{step_label}}</li><li><strong>Điểm AI:</strong> {{ai_score}}</li></ul><p><a href="{{approval_link}}">Mở để phê duyệt</a></p><p>— Mắt Việt HR</p>',
   '["actor_name","candidate_name","job_title","step_label","ai_score","approval_link"]', 0, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
--> statement-breakpoint

-- =============== departments seed (placeholder; admin will edit) ===============
INSERT OR IGNORE INTO departments (id, name, code, created_at, updated_at) VALUES
  ('00000000-0000-4000-8000-000000000301', 'Bán lẻ', 'RETAIL',
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('00000000-0000-4000-8000-000000000302', 'Kỹ thuật quang học', 'OPTICS',
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('00000000-0000-4000-8000-000000000303', 'Văn phòng', 'OFFICE',
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('00000000-0000-4000-8000-000000000304', 'Marketing', 'MKT',
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('00000000-0000-4000-8000-000000000305', 'Nhân sự', 'HR',
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
