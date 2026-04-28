-- Migration 0010 — Seed defaults: weight templates, email templates, departments

-- =============== weight_templates (4 role families per PRD §6) ===============
insert into public.weight_templates (family, name_vi, weights) values
  ('sales', 'Sales (bán hàng)', jsonb_build_object(
    'industry_fit', 0.20, 'professional_skills', 0.20, 'work_experience', 0.20,
    'years_experience', 0.15, 'education', 0.10, 'location', 0.15)),
  ('optician', 'Kỹ thuật viên quang học', jsonb_build_object(
    'industry_fit', 0.25, 'professional_skills', 0.30, 'work_experience', 0.15,
    'years_experience', 0.10, 'education', 0.15, 'location', 0.05)),
  ('office', 'Văn phòng', jsonb_build_object(
    'industry_fit', 0.15, 'professional_skills', 0.25, 'work_experience', 0.20,
    'years_experience', 0.15, 'education', 0.15, 'location', 0.10)),
  ('manager', 'Quản lý', jsonb_build_object(
    'industry_fit', 0.20, 'professional_skills', 0.20, 'work_experience', 0.25,
    'years_experience', 0.20, 'education', 0.10, 'location', 0.05))
on conflict (family) do update set
  name_vi = excluded.name_vi,
  weights = excluded.weights,
  updated_at = now();

-- =============== email_templates (7 defaults per PRD FR-06) ===============
insert into public.email_templates (code, name_vi, subject_vi, body_html, variables, requires_approval) values
  ('receipt_ack', 'Xác nhận đã nhận CV',
   'Cảm ơn bạn đã ứng tuyển vị trí {{job_title}} tại Mắt Việt',
   '<p>Kính gửi {{candidate_name}},</p><p>Mắt Việt xin xác nhận đã nhận hồ sơ ứng tuyển vị trí <strong>{{job_title}}</strong> của bạn. Chúng tôi sẽ xem xét và phản hồi trong vòng 5 ngày làm việc.</p><p>Trân trọng,<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title"]'::jsonb, false),

  ('interview_invite', 'Lời mời phỏng vấn',
   'Lời mời phỏng vấn vị trí {{job_title}} — Mắt Việt',
   '<p>Kính gửi {{candidate_name}},</p><p>Mắt Việt trân trọng mời bạn tham dự buổi phỏng vấn cho vị trí <strong>{{job_title}}</strong>.</p><ul><li><strong>Thời gian:</strong> {{interview_time}}</li><li><strong>Địa điểm / Hình thức:</strong> {{interview_location}}</li><li><strong>Người phỏng vấn:</strong> {{interviewers}}</li></ul><p>Vui lòng phản hồi email này để xác nhận. Nếu cần dời lịch, xin báo trước 24 giờ.</p><p>Trân trọng,<br/>{{hr_name}}<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title","interview_time","interview_location","interviewers","hr_name"]'::jsonb, true),

  ('interview_reminder_24h', 'Nhắc lịch phỏng vấn 24h',
   'Nhắc lịch phỏng vấn ngày mai — {{job_title}}',
   '<p>Kính gửi {{candidate_name}},</p><p>Đây là email nhắc lịch buổi phỏng vấn vị trí <strong>{{job_title}}</strong> sẽ diễn ra vào <strong>{{interview_time}}</strong> tại {{interview_location}}.</p><p>Hẹn gặp bạn!</p><p>Trân trọng,<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title","interview_time","interview_location"]'::jsonb, false),

  ('assessment_send', 'Gửi bài test',
   'Bài kiểm tra cho vị trí {{job_title}}',
   '<p>Kính gửi {{candidate_name}},</p><p>Cảm ơn bạn đã hoàn tất vòng phỏng vấn. Để tiếp tục quy trình, mời bạn hoàn thành bài kiểm tra cho vị trí <strong>{{job_title}}</strong>.</p><p><a href="{{download_link}}">Tải đề bài tại đây</a> (link có hiệu lực 48 giờ)</p><p>Vui lòng gửi bài làm dưới dạng đính kèm trả lời email này trong vòng <strong>{{time_limit}}</strong>.</p><p>Trân trọng,<br/>{{hr_name}}<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title","download_link","time_limit","hr_name"]'::jsonb, false),

  ('offer', 'Thư mời nhận việc',
   'Thư mời nhận việc — vị trí {{job_title}} tại Mắt Việt',
   '<p>Kính gửi {{candidate_name}},</p><p>Mắt Việt rất vui mừng gửi đến bạn lời mời chính thức cho vị trí <strong>{{job_title}}</strong>.</p><ul><li><strong>Mức lương:</strong> {{salary}}</li><li><strong>Ngày bắt đầu:</strong> {{start_date}}</li><li><strong>Phòng ban:</strong> {{department}}</li></ul><p>Vui lòng phản hồi xác nhận trước {{deadline}}.</p><p>Chào mừng bạn gia nhập đội ngũ Mắt Việt!</p><p>Trân trọng,<br/>{{hr_name}}<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title","salary","start_date","department","deadline","hr_name"]'::jsonb, true),

  ('rejection', 'Thư cảm ơn (không phù hợp)',
   'Phản hồi đơn ứng tuyển vị trí {{job_title}}',
   '<p>Kính gửi {{candidate_name}},</p><p>Cảm ơn bạn đã quan tâm và dành thời gian ứng tuyển vào vị trí <strong>{{job_title}}</strong> tại Mắt Việt.</p><p>Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc thông báo bạn chưa phù hợp với vị trí lần này. Chúng tôi sẽ lưu hồ sơ và liên hệ lại nếu có cơ hội phù hợp hơn trong tương lai.</p><p>Chúc bạn thành công trên con đường nghề nghiệp.</p><p>Trân trọng,<br/>Phòng Nhân sự Mắt Việt</p>',
   '["candidate_name","job_title"]'::jsonb, true),

  ('internal_approval_request', 'Yêu cầu phê duyệt nội bộ',
   '[Phê duyệt] {{candidate_name}} — {{job_title}} — bước {{step_label}}',
   '<p>Xin chào {{actor_name}},</p><p>Có một yêu cầu phê duyệt cần xử lý:</p><ul><li><strong>Ứng viên:</strong> {{candidate_name}}</li><li><strong>Vị trí:</strong> {{job_title}}</li><li><strong>Bước:</strong> {{step_label}}</li><li><strong>Điểm AI:</strong> {{ai_score}}</li></ul><p><a href="{{approval_link}}">Mở để phê duyệt</a></p><p>— Mắt Việt HR</p>',
   '["actor_name","candidate_name","job_title","step_label","ai_score","approval_link"]'::jsonb, false)
on conflict (code) do update set
  name_vi = excluded.name_vi,
  subject_vi = excluded.subject_vi,
  body_html = excluded.body_html,
  variables = excluded.variables,
  requires_approval = excluded.requires_approval,
  updated_at = now();

-- =============== departments seed (placeholder; admin will edit) ===============
insert into public.departments (name, code) values
  ('Bán lẻ', 'RETAIL'),
  ('Kỹ thuật quang học', 'OPTICS'),
  ('Văn phòng', 'OFFICE'),
  ('Marketing', 'MKT'),
  ('Nhân sự', 'HR')
on conflict (code) do nothing;
