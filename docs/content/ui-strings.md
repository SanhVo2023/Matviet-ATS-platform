# UI Strings (Vietnamese i18n)

**Status:** Approved (2026-04-28)
**Approver:** Sanh Võ. chị Hương spot-check happens during Group 1 staging review (no blocker for code generation).

**Source-of-truth** for `src/lib/vietnam/i18n.ts`. Frozen before Group 1 starts so the codebase imports a stable typed module.

**Lexicon convention:** lowercase keys; nested objects per page/feature; type-safe via `as const`.

---

## Navigation

| Key | Vietnamese |
|---|---|
| `nav.dashboard` | Tổng quan |
| `nav.inbox` | Hộp việc cần làm |
| `nav.jobs` | Tin tuyển dụng |
| `nav.candidates` | Ứng viên |
| `nav.pipeline` | Quy trình |
| `nav.interviews` | Phỏng vấn |
| `nav.approvals` | Phê duyệt |
| `nav.emails` | Email |
| `nav.tests` | Bài test |
| `nav.reports` | Báo cáo |
| `nav.referrals` | Giới thiệu nội bộ |
| `nav.settings` | Cài đặt |
| `nav.audit` | Nhật ký hệ thống |

## Common actions

| Key | Vietnamese |
|---|---|
| `action.create` | Tạo mới |
| `action.save` | Lưu |
| `action.cancel` | Hủy |
| `action.delete` | Xóa |
| `action.edit` | Chỉnh sửa |
| `action.send` | Gửi |
| `action.preview` | Xem trước |
| `action.approve` | Duyệt |
| `action.reject` | Từ chối |
| `action.search` | Tìm kiếm |
| `action.filter` | Lọc |
| `action.sort` | Sắp xếp |
| `action.export` | Xuất |
| `action.import` | Nhập |
| `action.upload` | Tải lên |
| `action.download` | Tải về |
| `action.continue` | Tiếp tục |
| `action.back` | Quay lại |
| `action.confirm` | Xác nhận |
| `action.retry` | Thử lại |
| `action.viewDetail` | Xem chi tiết |
| `action.viewAll` | Xem tất cả |
| `action.markAsRead` | Đánh dấu đã đọc |
| `action.markAllRead` | Đánh dấu tất cả đã đọc |
| `action.duplicate` | Nhân bản |
| `action.archive` | Lưu trữ |
| `action.restore` | Khôi phục |

## Job statuses

| Key | Vietnamese |
|---|---|
| `jobStatus.draft` | Bản nháp |
| `jobStatus.open` | Đang mở |
| `jobStatus.paused` | Tạm dừng |
| `jobStatus.closed` | Đã đóng |
| `jobStatus.filled` | Đã tuyển đủ |

## Candidate stages

| Key | Vietnamese |
|---|---|
| `stage.new` | Mới |
| `stage.screening` | Đang chấm |
| `stage.screened` | Đã chấm |
| `stage.interview_scheduled` | Đã xếp lịch PV |
| `stage.interviewed` | Đã PV |
| `stage.assessment_sent` | Đã gửi test |
| `stage.assessment_done` | Đã làm test |
| `stage.proposed` | Đề xuất |
| `stage.salary_negotiation` | Đang deal lương |
| `stage.bod_review` | BOD đang duyệt |
| `stage.group_review` | Tập đoàn đang duyệt |
| `stage.offer_sent` | Đã gửi offer |
| `stage.offer_accepted` | Đã nhận offer |
| `stage.hired` | Đã tuyển |
| `stage.rejected` | Từ chối |
| `stage.withdrawn` | Rút hồ sơ |

## CV sources

| Key | Vietnamese |
|---|---|
| `source.manual_upload` | Tải lên thủ công |
| `source.email_inbox` | Hộp thư hr@ |
| `source.csv_import` | Nhập từ CSV |
| `source.topcv_api` | TopCV API |
| `source.referral` | Giới thiệu nội bộ |

## Role families

| Key | Vietnamese |
|---|---|
| `roleFamily.sales` | Bán hàng |
| `roleFamily.optical_tech` | Kỹ thuật quang học |
| `roleFamily.office` | Văn phòng |
| `roleFamily.management` | Cấp quản lý |

## Interview types

| Key | Vietnamese |
|---|---|
| `interviewType.in_person` | Trực tiếp |
| `interviewType.phone` | Điện thoại |
| `interviewType.video` | Online (Microsoft Teams) |

## Recommendations (interview review)

| Key | Vietnamese |
|---|---|
| `recommendation.strong_hire` | Rất nên tuyển |
| `recommendation.hire` | Nên tuyển |
| `recommendation.maybe` | Cân nhắc |
| `recommendation.no_hire` | Không nên tuyển |

## AI scoring criteria (display labels)

| Key | Vietnamese |
|---|---|
| `criterion.industry_fit` | Phù hợp ngành nghề |
| `criterion.professional_skills` | Kỹ năng chuyên môn |
| `criterion.work_experience` | Kinh nghiệm làm việc |
| `criterion.years_experience` | Số năm kinh nghiệm |
| `criterion.education` | Trình độ học vấn |
| `criterion.location` | Địa điểm |

## Approval steps (display labels)

| Key | Vietnamese |
|---|---|
| `approvalActor.hr_and_manager` | HR + Trưởng phòng đề xuất |
| `approvalActor.hr_salary` | HR deal lương |
| `approvalActor.bod` | BOD duyệt |
| `approvalActor.group` | Quản lý Tập đoàn duyệt |
| `approvalActor.offer` | Gửi offer |

## Empty states

| Key | Vietnamese |
|---|---|
| `empty.jobs` | Chưa có tin tuyển dụng nào. Hãy tạo tin đầu tiên. |
| `empty.candidates` | Chưa có ứng viên. CV sẽ tự động hiện ở đây khi có. Bạn cũng có thể tải lên thủ công. |
| `empty.interviewsToday` | Không có phỏng vấn hôm nay. Một ngày yên tĩnh! |
| `empty.interviewsUpcoming` | Không có phỏng vấn sắp tới. |
| `empty.approvals` | Không có gì chờ duyệt. Tốt lắm! |
| `empty.notifications` | Bạn đã xem hết thông báo. |
| `empty.search` | Không tìm thấy kết quả phù hợp. |
| `empty.managerInbox` | Không có việc cần xử lý. Tốt lắm! |
| `empty.reports` | Chưa đủ dữ liệu để tạo báo cáo. Cần ít nhất 7 ngày hoạt động. |

## Error messages

| Key | Vietnamese |
|---|---|
| `error.generic` | Có lỗi xảy ra. Vui lòng thử lại. |
| `error.network` | Không kết nối được máy chủ. Kiểm tra mạng và thử lại. |
| `error.unauthorized` | Bạn không có quyền thực hiện thao tác này. |
| `error.notFound` | Không tìm thấy nội dung này. |
| `error.validation` | Vui lòng kiểm tra lại thông tin nhập. |
| `error.weights_sum` | Tổng trọng số phải bằng 100%. |
| `error.fileTooLarge` | File quá lớn. Tối đa 10 MB. |
| `error.fileType` | Loại file không hỗ trợ. Vui lòng dùng PDF hoặc DOCX. |
| `error.email_send` | Không gửi được email. {{reason}} |
| `error.ai_quota` | AI tạm dừng — tiếp tục sau {{reset_time}}. |
| `error.ai_failed` | Không chấm điểm được CV. Vui lòng review thủ công. |
| `error.session_expired` | Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại. |
| `error.too_many_attempts` | Sai mật khẩu nhiều lần. Vui lòng thử lại sau 1 giờ. |

## Success messages

| Key | Vietnamese |
|---|---|
| `success.saved` | Đã lưu. |
| `success.draftSaved` | Đã lưu bản nháp. |
| `success.deleted` | Đã xóa. |
| `success.deletedWithUndo` | Đã xóa. {{undoLink}} |
| `success.emailSent` | Đã gửi email. |
| `success.emailQueued` | Email đã được lên lịch gửi. |
| `success.invited` | Đã gửi lời mời tham gia. |
| `success.approved` | Đã duyệt. |
| `success.rejected` | Đã từ chối. |
| `success.scheduled` | Đã đặt lịch phỏng vấn. |
| `success.scoreUpdated` | Đã cập nhật điểm. |
| `success.imported` | Đã nhập {{count}} ứng viên. |

## Confirmation dialogs

| Key | Vietnamese |
|---|---|
| `confirm.delete.title` | Xóa {{item}}? |
| `confirm.delete.message` | Hành động này không thể hoàn tác. |
| `confirm.delete.confirmLabel` | Xóa |
| `confirm.delete.cancelLabel` | Hủy |
| `confirm.sendEmail.title` | Gửi email? |
| `confirm.sendEmail.message` | Email sẽ được gửi đến {{recipient}}. |
| `confirm.reject.title` | Từ chối ứng viên? |
| `confirm.reject.message` | Hệ thống sẽ tự động gửi email thông báo cho ứng viên. |

## Form labels (job creation)

| Key | Vietnamese |
|---|---|
| `jobForm.title` | Tiêu đề công việc |
| `jobForm.department` | Phòng ban |
| `jobForm.roleFamily` | Loại vị trí |
| `jobForm.flowType.label` | Quy trình duyệt |
| `jobForm.flowType.staff` | Nhân viên (3 bước) |
| `jobForm.flowType.management` | Cấp quản lý (4 bước) |
| `jobForm.location` | Địa điểm làm việc |
| `jobForm.headcount` | Số lượng cần tuyển |
| `jobForm.description` | Mô tả công việc |
| `jobForm.requirements` | Yêu cầu |
| `jobForm.salaryFrom` | Lương từ |
| `jobForm.salaryTo` | Đến |
| `jobForm.salaryNegotiable` | Thương lượng |
| `jobForm.weights.title` | Trọng số AI (cộng lại 100%) |
| `jobForm.hiringManager` | Trưởng phòng phụ trách |

## Form labels (candidate)

| Key | Vietnamese |
|---|---|
| `candidate.fullName` | Họ và tên |
| `candidate.email` | Email |
| `candidate.phone` | Số điện thoại |
| `candidate.cvFile` | CV (PDF / DOCX) |
| `candidate.appliedTo` | Vị trí ứng tuyển |
| `candidate.source` | Nguồn |
| `candidate.notes` | Ghi chú |

## Form labels (interview)

| Key | Vietnamese |
|---|---|
| `interview.candidate` | Ứng viên |
| `interview.scheduledAt` | Thời gian |
| `interview.duration` | Thời lượng (phút) |
| `interview.type` | Hình thức |
| `interview.location` | Địa điểm / Link |
| `interview.interviewers` | Người phỏng vấn |
| `interview.notes` | Ghi chú nội bộ |
| `interview.review.technical` | Chuyên môn |
| `interview.review.soft` | Kỹ năng mềm |
| `interview.review.experience` | Kinh nghiệm liên quan |
| `interview.review.culture` | Phù hợp văn hóa |
| `interview.review.potential` | Tiềm năng phát triển |
| `interview.review.attitude` | Thái độ |
| `interview.review.strengths` | Điểm mạnh |
| `interview.review.concerns` | Điểm cần cân nhắc |
| `interview.review.salaryProposed` | Mức lương đề xuất |
| `interview.review.recommendation` | Khuyến nghị |
| `interview.review.privateNotes` | Ghi chú nội bộ (HR-only) |

## Dashboard labels

| Key | Vietnamese |
|---|---|
| `dashboard.cards.openJobs` | Vị trí đang mở |
| `dashboard.cards.newCvs` | CV mới (7 ngày) |
| `dashboard.cards.todayInterviews` | PV hôm nay |
| `dashboard.cards.pendingApprovals` | Chờ duyệt |
| `dashboard.funnel.title` | Phễu tuyển dụng |
| `dashboard.todaySchedule.title` | Lịch hôm nay |
| `dashboard.waitForMe.title` | Cần chị xử lý |
| `dashboard.activityFeed.title` | Hoạt động gần đây |

## Manager landing labels

| Key | Vietnamese |
|---|---|
| `managerInbox.greeting` | Chào {{name}}, |
| `managerInbox.toDo.title` | Cần xử lý |
| `managerInbox.upcomingInterviews.title` | Lịch phỏng vấn sắp tới |
| `managerInbox.myJobs.title` | Vị trí của tôi |
| `managerInbox.openTeams` | Mở Teams |
| `managerInbox.viewDetail` | Chi tiết |
| `managerInbox.actions.review` | Xem ngay |
| `managerInbox.actions.fillForm` | Điền form |
| `managerInbox.actions.approve` | Duyệt |

## AI scoring UI

| Key | Vietnamese |
|---|---|
| `score.overall` | Điểm tổng |
| `score.evidence.verified` | Đã xác minh |
| `score.evidence.unverified` | Chưa xác minh |
| `score.evidence.tooltip` | Trích dẫn chưa khớp với CV. Cần kiểm tra thủ công. |
| `score.rescore` | Chấm lại |
| `score.rescoreNeeded` | Trọng số đã thay đổi — bấm để chấm lại |
| `score.manual` | Chấm thủ công |
| `score.failed` | Cần review thủ công |
| `score.pending` | Đang chấm... |

## Pipeline / Kanban

| Key | Vietnamese |
|---|---|
| `pipeline.viewToggle.kanban` | Kanban |
| `pipeline.viewToggle.table` | Bảng |
| `pipeline.bulkActions.changeStage` | Chuyển giai đoạn |
| `pipeline.bulkActions.sendEmail` | Gửi email |
| `pipeline.bulkActions.export` | Xuất CSV |
| `pipeline.bulkActions.delete` | Xóa |
| `pipeline.daysInStage` | {{count}} ngày |

## Reports

| Key | Vietnamese |
|---|---|
| `reports.charts.funnel` | Phễu tuyển dụng |
| `reports.charts.timeToHire` | Thời gian tuyển trung bình |
| `reports.charts.sourceEffectiveness` | Nguồn CV hiệu quả |
| `reports.charts.scoreDistribution` | Phân phối điểm AI |
| `reports.charts.stageConversion` | Chuyển đổi theo giai đoạn |
| `reports.charts.hiresPerMonth` | Tuyển theo tháng |
| `reports.export.pdf` | Xuất PDF báo cáo |
| `reports.export.excel` | Xuất Excel |

## Generic time / count

| Key | Vietnamese |
|---|---|
| `time.now` | Vừa xong |
| `time.minutesAgo` | {{count}} phút trước |
| `time.hoursAgo` | {{count}} giờ trước |
| `time.daysAgo` | {{count}} ngày trước |
| `time.yesterday` | Hôm qua |
| `time.today` | Hôm nay |
| `time.tomorrow` | Ngày mai |
| `count.candidates` | {{count}} ứng viên |
| `count.jobs` | {{count}} vị trí |
| `count.interviews` | {{count}} phỏng vấn |
| `count.results` | {{count}} kết quả |

---

## Post-approval next steps

- [ ] Generate `src/lib/vietnam/i18n.ts` from this file (script: `scripts/generate-i18n.ts`) during Group 1 build
- [ ] chị Hương spot-check during Group 1 staging review; minor edits applied in-place to this file + regenerated TS

## Open follow-ups

- [ ] Confirm whether "Tốt lắm!" in empty states feels right or should be "Hôm nay không có việc gì cấp" (tone testing during HR UAT)
- [ ] Add "{{name}}" form variants where personal greeting matters more than role-based "anh/chị" defaults
