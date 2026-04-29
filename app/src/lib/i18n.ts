/**
 * Mắt Việt HR — Vietnamese i18n source of truth.
 *
 * Hand-edit this file. Keys here must match `docs/content/ui-strings.md`.
 * Stage / role / recommendation / approval keys exactly match the corresponding
 * Postgres enums in `app/supabase/migrations/0001_extensions_and_enums.sql`.
 *
 * Pattern: `t.nav.dashboard` rather than t('nav.dashboard') — flat key paths
 * keep TypeScript autocomplete and avoid runtime string-key lookups.
 *
 * Interpolation: use `interpolate(template, vars)` from this module —
 * `{{name}}` placeholders only. Vietnamese text often contains literal
 * curly-quote characters; the regex is `\{\{(\w+)\}\}` to avoid clashes.
 */

export const t = {
  app: {
    name: "Mắt Việt HR",
    description: "Hệ thống quản lý tuyển dụng thông minh",
    company: "Mắt Việt",
  },

  nav: {
    dashboard: "Tổng quan",
    inbox: "Hộp việc cần làm",
    jobs: "Tin tuyển dụng",
    candidates: "Ứng viên",
    pipeline: "Quy trình",
    interviews: "Phỏng vấn",
    approvals: "Phê duyệt",
    emails: "Email",
    tests: "Bài test",
    reports: "Báo cáo",
    referrals: "Giới thiệu nội bộ",
    settings: "Cài đặt",
    audit: "Nhật ký hệ thống",
  },

  action: {
    create: "Tạo mới",
    save: "Lưu",
    cancel: "Hủy",
    delete: "Xóa",
    edit: "Chỉnh sửa",
    send: "Gửi",
    preview: "Xem trước",
    approve: "Duyệt",
    reject: "Từ chối",
    search: "Tìm kiếm",
    filter: "Lọc",
    sort: "Sắp xếp",
    export: "Xuất",
    import: "Nhập",
    upload: "Tải lên",
    download: "Tải về",
    continue: "Tiếp tục",
    back: "Quay lại",
    confirm: "Xác nhận",
    retry: "Thử lại",
    viewDetail: "Xem chi tiết",
    viewAll: "Xem tất cả",
    markAsRead: "Đánh dấu đã đọc",
    markAllRead: "Đánh dấu tất cả đã đọc",
    duplicate: "Nhân bản",
    archive: "Lưu trữ",
    restore: "Khôi phục",
    signIn: "Đăng nhập",
    signOut: "Đăng xuất",
    forgotPassword: "Quên mật khẩu?",
    resetPassword: "Đặt lại mật khẩu",
    showPassword: "Hiển thị",
    hidePassword: "Ẩn",
  },

  // Matches enum job_status (draft / open / paused / closed / filled)
  jobStatus: {
    draft: "Bản nháp",
    open: "Đang mở",
    paused: "Tạm dừng",
    closed: "Đã đóng",
    filled: "Đã tuyển đủ",
  },

  // Matches enum pipeline_stage — 16 values
  stage: {
    new: "Mới",
    screening: "Đang chấm",
    screened: "Đã chấm",
    interview_scheduled: "Đã xếp lịch PV",
    interviewed: "Đã PV",
    test_sent: "Đã gửi test",
    test_done: "Đã làm test",
    recommended: "Đề xuất",
    salary_deal: "Đang deal lương",
    bod_review: "BOD đang duyệt",
    tap_doan_review: "Tập đoàn đang duyệt",
    offer_sent: "Đã gửi offer",
    offer_accepted: "Đã nhận offer",
    hired: "Đã tuyển",
    rejected: "Từ chối",
    withdrew: "Rút hồ sơ",
  },

  // Matches enum candidate_source
  source: {
    manual_upload: "Tải lên thủ công",
    email_inbox: "Hộp thư hr@",
    csv_import: "Nhập từ CSV",
    topcv_api: "TopCV API",
    referral: "Giới thiệu nội bộ",
  },

  // Matches enum role_family
  roleFamily: {
    sales: "Bán hàng",
    optician: "Kỹ thuật viên quang học",
    office: "Văn phòng",
    manager: "Cấp quản lý",
    custom: "Tùy chỉnh",
  },

  // Matches enum user_role
  userRole: {
    admin: "Quản trị viên",
    hr: "Nhân sự",
    hiring_manager: "Trưởng phòng",
    bod: "Ban Giám đốc",
    tap_doan: "Quản lý Tập đoàn",
  },

  // Matches enum interview_type
  interviewType: {
    in_person: "Trực tiếp",
    phone: "Điện thoại",
    video: "Online (Microsoft Teams)",
  },

  // Matches enum interview_status
  interviewStatus: {
    scheduled: "Đã lên lịch",
    completed: "Đã hoàn thành",
    cancelled: "Đã hủy",
    no_show: "Không tham dự",
  },

  // Matches enum recommendation
  recommendation: {
    strong_yes: "Rất nên tuyển",
    yes: "Nên tuyển",
    maybe: "Cân nhắc",
    no: "Không nên tuyển",
  },

  // Matches enum approval_step_kind
  approvalStep: {
    hr_recommend: "HR đề xuất",
    manager_recommend: "Trưởng phòng đề xuất",
    salary_deal: "HR deal lương",
    bod: "BOD duyệt",
    tap_doan: "Quản lý Tập đoàn duyệt",
  },

  // Matches enum approval_status
  approvalStatus: {
    pending: "Đang chờ",
    approved: "Đã duyệt",
    rejected: "Từ chối",
  },

  // Six AI scoring criteria
  criterion: {
    industry_fit: "Phù hợp ngành nghề",
    professional_skills: "Kỹ năng chuyên môn",
    work_experience: "Kinh nghiệm làm việc",
    years_experience: "Số năm kinh nghiệm",
    education: "Trình độ học vấn",
    location: "Địa điểm",
  },

  empty: {
    jobs: "Chưa có tin tuyển dụng nào. Hãy tạo tin đầu tiên.",
    candidates:
      "Chưa có ứng viên. CV sẽ tự động hiện ở đây khi có. Bạn cũng có thể tải lên thủ công.",
    interviewsToday: "Không có phỏng vấn hôm nay. Một ngày yên tĩnh!",
    interviewsUpcoming: "Không có phỏng vấn sắp tới.",
    approvals: "Không có gì chờ duyệt. Tốt lắm!",
    notifications: "Bạn đã xem hết thông báo.",
    search: "Không tìm thấy kết quả phù hợp.",
    managerInbox: "Không có việc cần xử lý. Tốt lắm!",
    reports: "Chưa đủ dữ liệu để tạo báo cáo. Cần ít nhất 7 ngày hoạt động.",
  },

  error: {
    generic: "Có lỗi xảy ra. Vui lòng thử lại.",
    network: "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.",
    unauthorized: "Bạn không có quyền thực hiện thao tác này.",
    notFound: "Không tìm thấy nội dung này.",
    validation: "Vui lòng kiểm tra lại thông tin nhập.",
    weights_sum: "Tổng trọng số phải bằng 100%.",
    fileTooLarge: "File quá lớn. Tối đa 10 MB.",
    fileType: "Loại file không hỗ trợ. Vui lòng dùng PDF hoặc DOCX.",
    email_send: "Không gửi được email. {{reason}}",
    ai_quota: "AI tạm dừng — tiếp tục sau {{reset_time}}.",
    ai_failed: "Không chấm điểm được CV. Vui lòng review thủ công.",
    session_expired: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
    too_many_attempts: "Sai mật khẩu nhiều lần. Vui lòng thử lại sau 1 giờ.",
    invalidCredentials: "Email hoặc mật khẩu không đúng.",
  },

  success: {
    saved: "Đã lưu.",
    draftSaved: "Đã lưu bản nháp.",
    deleted: "Đã xóa.",
    deletedWithUndo: "Đã xóa. {{undoLink}}",
    emailSent: "Đã gửi email.",
    emailQueued: "Email đã được lên lịch gửi.",
    invited: "Đã gửi lời mời tham gia.",
    approved: "Đã duyệt.",
    rejected: "Đã từ chối.",
    scheduled: "Đã đặt lịch phỏng vấn.",
    scoreUpdated: "Đã cập nhật điểm.",
    imported: "Đã nhập {{count}} ứng viên.",
    passwordReset: "Đã gửi email đặt lại mật khẩu.",
    signedIn: "Chào mừng quay lại, {{name}}.",
  },

  confirm: {
    delete: {
      title: "Xóa {{item}}?",
      message: "Hành động này không thể hoàn tác.",
      confirmLabel: "Xóa",
      cancelLabel: "Hủy",
    },
    sendEmail: {
      title: "Gửi email?",
      message: "Email sẽ được gửi đến {{recipient}}.",
    },
    reject: {
      title: "Từ chối ứng viên?",
      message: "Hệ thống sẽ tự động gửi email thông báo cho ứng viên.",
    },
    signOut: {
      title: "Đăng xuất?",
      message: "Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng.",
    },
  },

  jobForm: {
    title: "Tiêu đề công việc",
    department: "Phòng ban",
    roleFamily: "Loại vị trí",
    flowType: {
      label: "Quy trình duyệt",
      staff: "Nhân viên (3 bước)",
      management: "Cấp quản lý (4 bước)",
    },
    location: "Địa điểm làm việc",
    headcount: "Số lượng cần tuyển",
    description: "Mô tả công việc",
    requirements: "Yêu cầu",
    salaryFrom: "Lương từ",
    salaryTo: "Đến",
    salaryNegotiable: "Thương lượng",
    weights: { title: "Trọng số AI (cộng lại 100%)" },
    hiringManager: "Trưởng phòng phụ trách",
  },

  candidate: {
    fullName: "Họ và tên",
    email: "Email",
    phone: "Số điện thoại",
    cvFile: "CV (PDF / DOCX)",
    appliedTo: "Vị trí ứng tuyển",
    source: "Nguồn",
    notes: "Ghi chú",
  },

  interview: {
    candidate: "Ứng viên",
    scheduledAt: "Thời gian",
    duration: "Thời lượng (phút)",
    type: "Hình thức",
    location: "Địa điểm / Link",
    interviewers: "Người phỏng vấn",
    notes: "Ghi chú nội bộ",
    review: {
      technical: "Chuyên môn",
      soft: "Kỹ năng mềm",
      experience: "Kinh nghiệm liên quan",
      culture: "Phù hợp văn hóa",
      potential: "Tiềm năng phát triển",
      attitude: "Thái độ",
      strengths: "Điểm mạnh",
      concerns: "Điểm cần cân nhắc",
      salaryProposed: "Mức lương đề xuất",
      recommendation: "Khuyến nghị",
      privateNotes: "Ghi chú nội bộ (HR-only)",
    },
  },

  dashboard: {
    cards: {
      openJobs: "Vị trí đang mở",
      newCvs: "CV mới (7 ngày)",
      todayInterviews: "PV hôm nay",
      pendingApprovals: "Chờ duyệt",
    },
    funnel: { title: "Phễu tuyển dụng" },
    todaySchedule: { title: "Lịch hôm nay" },
    waitForMe: { title: "Cần chị xử lý" },
    activityFeed: { title: "Hoạt động gần đây" },
  },

  managerInbox: {
    greeting: "Chào {{name}},",
    toDo: { title: "Cần xử lý" },
    upcomingInterviews: { title: "Lịch phỏng vấn sắp tới" },
    myJobs: { title: "Vị trí của tôi" },
    openTeams: "Mở Teams",
    viewDetail: "Chi tiết",
    actions: {
      review: "Xem ngay",
      fillForm: "Điền form",
      approve: "Duyệt",
    },
  },

  score: {
    overall: "Điểm tổng",
    evidence: {
      verified: "Đã xác minh",
      unverified: "Chưa xác minh",
      tooltip: "Trích dẫn chưa khớp với CV. Cần kiểm tra thủ công.",
    },
    rescore: "Chấm lại",
    rescoreNeeded: "Trọng số đã thay đổi — bấm để chấm lại",
    manual: "Chấm thủ công",
    failed: "Cần review thủ công",
    pending: "Đang chấm...",
    summary: "Tóm tắt",
    reasoning: "Lý giải",
    noEvidence: "Không có bằng chứng cụ thể",
    retry: "Thử lại",
    weightsChanged: "Trọng số đã thay đổi từ lần chấm gần nhất",
    docxBlocked: "Cần chuyển đổi DOCX sang PDF — sẽ tự động xử lý khi worker hoạt động",
    runningHint: "AI đang chấm điểm — thường mất 15–30 giây.",
    runningTakingTooLong: "Quá lâu — thử lại?",
    manualHint: "Nhập điểm 0-100 cho từng tiêu chí.",
    manualSubmit: "Lưu điểm thủ công",
    weight: "Trọng số",
    cost: "Chi phí",
    scoredAt: "Chấm lúc",
    model: "Mô hình",
    expectedTotal: "Điểm tổng dự kiến",
  },

  pipeline: {
    viewToggle: { kanban: "Kanban", table: "Bảng" },
    bulkActions: {
      changeStage: "Chuyển giai đoạn",
      sendEmail: "Gửi email",
      export: "Xuất CSV",
      delete: "Xóa",
    },
    daysInStage: "{{count}} ngày",
  },

  reports: {
    charts: {
      funnel: "Phễu tuyển dụng",
      timeToHire: "Thời gian tuyển trung bình",
      sourceEffectiveness: "Nguồn CV hiệu quả",
      scoreDistribution: "Phân phối điểm AI",
      stageConversion: "Chuyển đổi theo giai đoạn",
      hiresPerMonth: "Tuyển theo tháng",
    },
    export: {
      pdf: "Xuất PDF báo cáo",
      excel: "Xuất Excel",
    },
  },

  time: {
    now: "Vừa xong",
    minutesAgo: "{{count}} phút trước",
    hoursAgo: "{{count}} giờ trước",
    daysAgo: "{{count}} ngày trước",
    yesterday: "Hôm qua",
    today: "Hôm nay",
    tomorrow: "Ngày mai",
  },

  count: {
    candidates: "{{count}} ứng viên",
    jobs: "{{count}} vị trí",
    interviews: "{{count}} phỏng vấn",
    results: "{{count}} kết quả",
  },

  auth: {
    loginTitle: "Đăng nhập",
    loginSubtitle: "Hệ thống quản lý tuyển dụng nội bộ",
    emailLabel: "Email",
    passwordLabel: "Mật khẩu",
    resetTitle: "Đặt lại mật khẩu",
    resetSubtitle: "Nhập email — chúng tôi sẽ gửi link đặt lại.",
    emailPlaceholder: "ten@matviet.com.vn",
    skipToContent: "Bỏ qua đến nội dung",
  },
} as const;

/**
 * Replace `{{name}}` placeholders with values.
 * Missing keys leave the placeholder intact (caller bug stays visible).
 */
export function interpolate(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * Convenience formatters for the most common interpolated strings,
 * so consumers don't import `interpolate` everywhere.
 */
export const tf = {
  daysAgo: (count: number) => interpolate(t.time.daysAgo, { count }),
  hoursAgo: (count: number) => interpolate(t.time.hoursAgo, { count }),
  minutesAgo: (count: number) => interpolate(t.time.minutesAgo, { count }),
  candidates: (count: number) => interpolate(t.count.candidates, { count }),
  jobs: (count: number) => interpolate(t.count.jobs, { count }),
  results: (count: number) => interpolate(t.count.results, { count }),
  greeting: (name: string) => interpolate(t.managerInbox.greeting, { name }),
  signedIn: (name: string) => interpolate(t.success.signedIn, { name }),
};
