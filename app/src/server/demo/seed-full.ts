import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  users,
  accounts,
  jobs,
  job_assignments,
  candidates,
  cv_files,
  ai_screenings,
  stage_history,
  interviews,
  interview_attendees,
  interview_evaluations,
  approvals,
  assessments,
  assessment_submissions,
  assessment_invite_tokens,
  email_messages,
} from "@/db/schema";
import { putFile } from "@/lib/r2";
import { getAuth } from "@/lib/auth-server";
import { seedDemoData } from "@/server/reports/seed-demo";
import type { VerifiedCriteria } from "@/lib/ai/gemini/types";

/**
 * Full-feature demo fixtures (G11 QA): one call makes EVERY feature testable —
 * demo accounts per role, jobs on both approval flows, candidates at every
 * pipeline stage (incl. failed AI screening for manual sliders), CV PDFs in
 * R2, interviews + one evaluation, pending approval steps for each approver
 * role, an assessment with a live public token, and an email queue in every
 * state. Finishes with the reports volume seeder (30 backdated candidates).
 *
 * Idempotent: refuses to run twice (marker = job code DEMO-SALES-01).
 */

const DEMO_PASSWORD = "MatViet@2026";
const nowIso = () => new Date().toISOString();
const daysFromNow = (d: number, h = 9) => {
  const t = new Date(Date.now() + d * 86_400_000);
  t.setUTCHours(h - 7, 0, 0, 0); // h:00 VN time
  return t.toISOString();
};

/** Minimal valid one-page PDF (renders in any viewer). */
function demoPdf(title: string): Uint8Array {
  const ascii = title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d");
  const content = `BT /F1 22 Tf 60 720 Td (${ascii}) Tj 0 -34 Td /F1 12 Tf (Mat Viet HR - tai lieu demo) Tj ET`;
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${content.length}>>stream
${content}
endstream
endobj
trailer<</Root 1 0 R>>
%%EOF`;
  return new TextEncoder().encode(pdf);
}

function criteria(scores: [number, number, number, number, number, number]): VerifiedCriteria {
  const [a, b, c, d, e, f] = scores;
  const mk = (
    score: number,
    reasoning: string,
    quote: string,
  ): VerifiedCriteria["industry_fit"] => ({
    score,
    reasoning,
    evidence_quotes: [{ text: quote, verified: true }],
  });
  return {
    industry_fit: mk(
      a,
      "Có kinh nghiệm ngành bán lẻ mắt kính.",
      "2 năm tư vấn tại cửa hàng kính thuốc",
    ),
    professional_skills: mk(
      b,
      "Kỹ năng tư vấn và đo khúc xạ cơ bản.",
      "chứng chỉ đo khúc xạ sơ cấp",
    ),
    work_experience: mk(
      c,
      "Kinh nghiệm bán hàng phù hợp mô tả.",
      "nhân viên bán hàng chuỗi thời trang",
    ),
    years_experience: mk(d, "Đủ số năm yêu cầu.", "3 năm kinh nghiệm"),
    education: mk(e, "Tốt nghiệp THPT, có chứng chỉ nghề.", "tốt nghiệp THPT 2019"),
    location: mk(f, "Sống gần khu vực cửa hàng.", "quận Bình Thạnh, TP.HCM"),
  };
}

const DEMO_WEIGHTS = {
  industry_fit: 0.2,
  professional_skills: 0.25,
  work_experience: 0.2,
  years_experience: 0.15,
  education: 0.1,
  location: 0.1,
};

const CV_TEXT =
  "NGUYỄN VĂN DEMO — Ứng viên mẫu. 3 năm kinh nghiệm nhân viên bán hàng chuỗi thời trang, 2 năm tư vấn tại cửa hàng kính thuốc, chứng chỉ đo khúc xạ sơ cấp. Tốt nghiệp THPT 2019. Địa chỉ: quận Bình Thạnh, TP.HCM.";

export interface FullSeedResult {
  alreadySeeded?: boolean;
  users?: Array<{ email: string; password: string; role: string }>;
  jobs?: number;
  richCandidates?: number;
  reportCandidates?: number;
  publicTestUrl?: string;
  notes?: string[];
}

export async function runFullDemoSeed(appUrl: string): Promise<FullSeedResult> {
  const db = await getDb();

  const marker = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.code, "DEMO-SALES-01"))
    .get();
  if (marker) return { alreadySeeded: true };

  const admin = await db.select().from(users).where(eq(users.role, "admin")).get();
  if (!admin) throw new Error("Chưa có tài khoản admin — chạy /api/setup trước.");

  // ---- 1. Demo accounts (better-auth-compatible scrypt hash) ----------------
  const authInstance = await getAuth();
  const ctx = await authInstance.$context;
  const passwordHash = await ctx.password.hash(DEMO_PASSWORD);

  const demoUsers = [
    { name: "Bùi Thị Hương (Demo)", email: "huong.demo@matviet.test", role: "hr" as const },
    {
      name: "Trần Quốc Toản (Demo)",
      email: "quanly.demo@matviet.test",
      role: "hiring_manager" as const,
    },
    { name: "Lý Thanh Sơn (Demo)", email: "bod.demo@matviet.test", role: "bod" as const },
    { name: "Văn Cao Cường (Demo)", email: "tapdoan.demo@matviet.test", role: "tap_doan" as const },
  ];
  const now = new Date();
  const userIds: Record<string, string> = {};
  for (const u of demoUsers) {
    const id = crypto.randomUUID();
    userIds[u.role] = id;
    await db.batch([
      db.insert(users).values({
        id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        role: u.role,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(accounts).values({
        id: crypto.randomUUID(),
        userId: id,
        accountId: id,
        providerId: "credential",
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
  }
  const managerId = userIds["hiring_manager"]!;

  // ---- 2. Jobs (staff flow + management flow + one draft) ------------------
  const job1 = crypto.randomUUID(); // staff flow
  const job2 = crypto.randomUUID(); // management flow
  const job3 = crypto.randomUUID(); // draft
  await db.batch([
    db.insert(jobs).values([
      {
        id: job1,
        title: "Nhân viên tư vấn bán kính (Demo)",
        code: "DEMO-SALES-01",
        role_family: "sales",
        flow_type: "staff",
        status: "open",
        headcount: 2,
        location: "CH Nguyễn Trãi, Q.5, TP.HCM",
        description: "<p>Tư vấn khách hàng chọn gọng và tròng kính, hỗ trợ đo khúc xạ cơ bản.</p>",
        requirements: { html: "<ul><li>Tối thiểu 1 năm bán lẻ</li><li>Giao tiếp tốt</li></ul>" },
        weights: DEMO_WEIGHTS,
        salary_min: 8_000_000,
        salary_max: 12_000_000,
        posted_at: daysFromNow(-20),
        created_by: admin.id,
      },
      {
        id: job2,
        title: "Cửa hàng trưởng khu vực (Demo)",
        code: "DEMO-MGR-01",
        role_family: "manager",
        flow_type: "management",
        status: "open",
        headcount: 1,
        location: "TP.HCM",
        description: "<p>Quản lý vận hành 3 cửa hàng khu vực trung tâm.</p>",
        requirements: { html: "<ul><li>3+ năm quản lý bán lẻ</li></ul>" },
        weights: DEMO_WEIGHTS,
        salary_min: 18_000_000,
        salary_max: 25_000_000,
        posted_at: daysFromNow(-30),
        created_by: admin.id,
      },
      {
        id: job3,
        title: "Kỹ thuật viên đo khúc xạ (Demo)",
        code: "DEMO-TECH-01",
        role_family: "optician",
        flow_type: "staff",
        status: "draft",
        headcount: 1,
        location: "Hà Nội",
        weights: DEMO_WEIGHTS,
        requirements: {},
        created_by: admin.id,
      },
    ]),
    db.insert(job_assignments).values([
      { job_id: job1, manager_user_id: managerId },
      { job_id: job2, manager_user_id: managerId },
    ]),
  ]);

  // ---- 3. Files in R2 -------------------------------------------------------
  await putFile("demo/cv-mai.pdf", demoPdf("CV - Nguyen Thi Mai"), "application/pdf");
  await putFile("demo/cv-hung.pdf", demoPdf("CV - Tran Van Hung"), "application/pdf");
  await putFile("demo/test-de-bai.pdf", demoPdf("De bai kiem tra tu van"), "application/pdf");
  await putFile("demo/submission-hanh.pdf", demoPdf("Bai lam - Do Thi Hanh"), "application/pdf");

  const cvMai = crypto.randomUUID();
  const cvHung = crypto.randomUUID();
  await db.insert(cv_files).values([
    {
      id: cvMai,
      storage_path: "demo/cv-mai.pdf",
      original_name: "CV-NguyenThiMai.pdf",
      mime: "application/pdf",
      size_bytes: 900,
      uploaded_by: admin.id,
    },
    {
      id: cvHung,
      storage_path: "demo/cv-hung.pdf",
      original_name: "CV-TranVanHung.pdf",
      mime: "application/pdf",
      size_bytes: 900,
      uploaded_by: admin.id,
    },
  ]);

  // ---- 4. Rich candidates at every stage ------------------------------------
  type CandidateInsert = typeof candidates.$inferInsert;
  const mk = (
    over: Partial<CandidateInsert> & Pick<CandidateInsert, "full_name">,
  ): CandidateInsert & { id: string } => ({
    id: crypto.randomUUID(),
    job_id: job1,
    source: "manual_upload" as const,
    source_meta: {},
    created_by: admin.id,
    cv_text: CV_TEXT,
    ...over,
  });

  const cMai = mk({
    full_name: "Nguyễn Thị Mai",
    email: "mai.demo@example.com",
    phone: "+84901000001",
    current_stage: "screened",
    cv_file_id: cvMai,
    ai_score: 87.5,
    ai_breakdown: criteria([90, 88, 85, 90, 80, 92]) as never,
    ai_scored_at: nowIso(),
    ai_screening_status: "success",
  });
  const cHung = mk({
    full_name: "Trần Văn Hùng",
    email: "hung.demo@example.com",
    phone: "+84901000002",
    current_stage: "screened",
    cv_file_id: cvHung,
    ai_score: 71.2,
    ai_breakdown: criteria([70, 72, 75, 70, 65, 74]) as never,
    ai_scored_at: nowIso(),
    ai_screening_status: "success",
  });
  const cThu = mk({
    full_name: "Lê Thị Thu",
    email: "thu.demo@example.com",
    phone: "+84901000003",
    current_stage: "new",
    ai_screening_status: "failed",
    ai_screening_error: "Cần chuyển đổi DOCX sang PDF (demo lỗi AI — thử chấm điểm thủ công)",
    cv_text: null,
  });
  const cTuan = mk({
    full_name: "Phạm Minh Tuấn",
    email: "tuan.demo@example.com",
    phone: "+84901000004",
    current_stage: "interview_scheduled",
    ai_score: 78,
    ai_breakdown: criteria([78, 80, 76, 75, 70, 85]) as never,
    ai_scored_at: nowIso(),
    ai_screening_status: "success",
  });
  const cLan = mk({
    full_name: "Hoàng Thị Lan",
    email: "lan.demo@example.com",
    phone: "+84901000005",
    current_stage: "interviewed",
    ai_score: 83,
    ai_breakdown: criteria([85, 82, 84, 80, 78, 88]) as never,
    ai_scored_at: nowIso(),
    ai_screening_status: "success",
  });
  const cAnh = mk({
    full_name: "Vũ Đức Anh",
    email: "ducanh.demo@example.com",
    phone: "+84901000006",
    current_stage: "test_sent",
    ai_score: 74,
    ai_screening_status: "success",
    ai_breakdown: criteria([74, 75, 72, 70, 76, 78]) as never,
    ai_scored_at: nowIso(),
  });
  const cHanh = mk({
    full_name: "Đỗ Thị Hạnh",
    email: "hanh.demo@example.com",
    phone: "+84901000007",
    current_stage: "test_done",
    ai_score: 81,
    ai_screening_status: "success",
    ai_breakdown: criteria([82, 80, 81, 78, 84, 80]) as never,
    ai_scored_at: nowIso(),
  });
  const cNam = mk({
    full_name: "Bùi Văn Nam",
    email: "nam.demo@example.com",
    phone: "+84901000008",
    current_stage: "recommended",
    ai_score: 88,
    ai_screening_status: "success",
    ai_breakdown: criteria([90, 87, 88, 85, 86, 90]) as never,
    ai_scored_at: nowIso(),
  });
  const cYen = mk({
    job_id: job2,
    full_name: "Ngô Thị Yến",
    email: "yen.demo@example.com",
    phone: "+84901000009",
    current_stage: "bod_review",
    ai_score: 91,
    ai_screening_status: "success",
    ai_breakdown: criteria([92, 90, 93, 88, 90, 92]) as never,
    ai_scored_at: nowIso(),
  });
  const cBao = mk({
    full_name: "Đặng Quốc Bảo",
    email: "bao.demo@example.com",
    phone: "+84901000010",
    current_stage: "offer_sent",
    ai_score: 86,
    ai_screening_status: "success",
    ai_breakdown: criteria([86, 85, 88, 84, 82, 90]) as never,
    ai_scored_at: nowIso(),
  });

  const rich = [cMai, cHung, cThu, cTuan, cLan, cAnh, cHanh, cNam, cYen, cBao];
  // D1 caps bound variables at 100 per statement — chunk the wide inserts.
  for (let i = 0; i < rich.length; i += 3) {
    await db.insert(candidates).values(rich.slice(i, i + 3));
  }
  const historyRows = rich.flatMap((c) => [
    {
      candidate_id: c.id!,
      from_stage: null,
      to_stage: "new" as const,
      actor_user_id: admin.id,
      at: daysFromNow(-10),
    },
    ...(c.current_stage !== "new"
      ? [
          {
            candidate_id: c.id!,
            from_stage: "new" as const,
            to_stage: c.current_stage!,
            actor_user_id: admin.id,
            at: daysFromNow(-3),
          },
        ]
      : []),
  ]);
  for (let i = 0; i < historyRows.length; i += 10) {
    await db.insert(stage_history).values(historyRows.slice(i, i + 10));
  }

  // AI screening audit rows for the two CV-backed candidates
  await db.insert(ai_screenings).values(
    [cMai, cHung].map((c) => ({
      candidate_id: c.id!,
      model: "gemini-2.5-flash",
      total: c.ai_score!,
      criteria: c.ai_breakdown as never,
      weights_snapshot: DEMO_WEIGHTS as never,
      tokens_in: 4200,
      tokens_out: 900,
      cost_usd: 0.0035,
      duration_ms: 18_000,
    })),
  );

  // ---- 5. Interviews --------------------------------------------------------
  const ivTuan = crypto.randomUUID();
  const ivLan = crypto.randomUUID();
  await db.batch([
    db.insert(interviews).values([
      {
        id: ivTuan,
        candidate_id: cTuan.id!,
        job_id: job1,
        scheduled_at: daysFromNow(1, 9),
        duration_min: 45,
        type: "video",
        status: "scheduled",
        location_or_link: "https://teams.microsoft.com/l/meetup-join/demo",
        teams_link: "https://teams.microsoft.com/l/meetup-join/demo",
        created_by: admin.id,
      },
      {
        id: ivLan,
        candidate_id: cLan.id!,
        job_id: job1,
        scheduled_at: daysFromNow(-2, 14),
        duration_min: 60,
        type: "in_person",
        status: "completed",
        location_or_link: "CH Nguyễn Trãi, Q.5",
        created_by: admin.id,
      },
    ]),
    db.insert(interview_attendees).values([
      { interview_id: ivTuan, user_id: admin.id, role: "interviewer" },
      { interview_id: ivTuan, user_id: managerId, role: "interviewer" },
      { interview_id: ivLan, user_id: managerId, role: "interviewer" },
    ]),
    db.insert(interview_evaluations).values({
      interview_id: ivLan,
      evaluator_user_id: managerId,
      scores: { attitude: 9, skills: 8, communication: 9 } as never,
      recommendation: "strong_yes",
      strengths: "Giao tiếp tự tin, hiểu sản phẩm nhanh, có kinh nghiệm xử lý khách khó.",
      concerns: "Chưa quen phần mềm bán hàng nội bộ — cần đào tạo 1 tuần.",
      proposed_salary: 10_500_000,
    }),
  ]);

  // ---- 6. Approvals ---------------------------------------------------------
  await db.insert(approvals).values([
    // Bùi Văn Nam (staff flow): HR approved → MANAGER PENDING (test với tài khoản quản lý)
    {
      candidate_id: cNam.id!,
      step_index: 0,
      step_kind: "hr_recommend",
      status: "approved",
      actor_user_id: admin.id,
      decided_at: daysFromNow(-2),
      notes: "Điểm AI cao, CV đạt.",
    },
    { candidate_id: cNam.id!, step_index: 1, step_kind: "manager_recommend", status: "pending" },
    { candidate_id: cNam.id!, step_index: 2, step_kind: "salary_deal", status: "pending" },
    // Ngô Thị Yến (management flow): HR + manager approved → BOD PENDING
    {
      candidate_id: cYen.id!,
      step_index: 0,
      step_kind: "hr_recommend",
      status: "approved",
      actor_user_id: admin.id,
      decided_at: daysFromNow(-4),
    },
    {
      candidate_id: cYen.id!,
      step_index: 1,
      step_kind: "manager_recommend",
      status: "approved",
      actor_user_id: managerId,
      decided_at: daysFromNow(-2),
      notes: "Đề xuất tuyển — kinh nghiệm quản lý tốt.",
    },
    { candidate_id: cYen.id!, step_index: 2, step_kind: "bod", status: "pending" },
    { candidate_id: cYen.id!, step_index: 3, step_kind: "tap_doan", status: "pending" },
    // Đặng Quốc Bảo: fully approved (staff)
    {
      candidate_id: cBao.id!,
      step_index: 0,
      step_kind: "hr_recommend",
      status: "approved",
      actor_user_id: admin.id,
      decided_at: daysFromNow(-6),
    },
    {
      candidate_id: cBao.id!,
      step_index: 1,
      step_kind: "manager_recommend",
      status: "approved",
      actor_user_id: managerId,
      decided_at: daysFromNow(-5),
    },
    {
      candidate_id: cBao.id!,
      step_index: 2,
      step_kind: "salary_deal",
      status: "approved",
      actor_user_id: admin.id,
      decided_at: daysFromNow(-4),
      notes: "Chốt 11.5tr/tháng.",
    },
  ]);

  // ---- 7. Assessment + public token -----------------------------------------
  const assess1 = crypto.randomUUID();
  const subAnh = crypto.randomUUID();
  const subHanh = crypto.randomUUID();
  const token = "demo-" + crypto.randomUUID().replace(/-/g, "");
  await db.batch([
    db.insert(assessments).values({
      id: assess1,
      job_id: job1,
      test_storage_path: "demo/test-de-bai.pdf",
      original_name: "De-bai-tu-van.pdf",
      instructions: "Làm bài trong 60 phút, nộp file PDF hoặc ảnh chụp bài làm.",
      time_limit_min: 60,
      is_active: true,
      created_by: admin.id,
    }),
    db.insert(assessment_submissions).values([
      { id: subAnh, assessment_id: assess1, candidate_id: cAnh.id! }, // chờ nộp
      {
        id: subHanh,
        assessment_id: assess1,
        candidate_id: cHanh.id!,
        submission_storage_path: "demo/submission-hanh.pdf",
        submitted_at: daysFromNow(-1),
      }, // đã nộp, chờ chấm
    ]),
    db.insert(assessment_invite_tokens).values({
      token,
      assessment_id: assess1,
      candidate_id: cAnh.id!,
      submission_id: subAnh,
      expires_at: daysFromNow(7),
    }),
  ]);

  // ---- 8. Emails in every queue state (none 'queued' — cron would send) -----
  await db.insert(email_messages).values([
    {
      direction: "outbound",
      status: "sent",
      candidate_id: cMai.id!,
      job_id: job1,
      template_code: "interview_invite",
      subject: "Mời phỏng vấn — Mắt Việt",
      body_html: "<p>Chào Mai, mời bạn tham gia phỏng vấn…</p>",
      to_emails: ["mai.demo@example.com"],
      sent_at: daysFromNow(-3),
      created_by: admin.id,
    },
    {
      direction: "outbound",
      status: "sent",
      candidate_id: cAnh.id!,
      job_id: job1,
      template_code: "assessment_send",
      subject: "Bài kiểm tra năng lực — Mắt Việt",
      body_html: `<p>Chào Đức Anh, làm bài tại liên kết đính kèm.</p>`,
      to_emails: ["ducanh.demo@example.com"],
      sent_at: daysFromNow(-2),
      created_by: admin.id,
    },
    {
      direction: "outbound",
      status: "failed",
      candidate_id: cHung.id!,
      job_id: job1,
      subject: "Thư cảm ơn — Mắt Việt",
      body_html: "<p>Cảm ơn bạn đã ứng tuyển…</p>",
      to_emails: ["hung.demo@example.com"],
      retry_count: 3,
      error: "Graph 403: ErrorAccessDenied (demo lỗi gửi — thử nút Thử lại)",
      created_by: admin.id,
    },
    {
      direction: "outbound",
      status: "pending_approval",
      candidate_id: cBao.id!,
      job_id: job1,
      template_code: "offer",
      subject: "Thư mời nhận việc — Mắt Việt",
      body_html: "<p>Chúc mừng Quốc Bảo! Mắt Việt trân trọng mời bạn…</p>",
      to_emails: ["bao.demo@example.com"],
      created_by: admin.id,
    },
  ]);

  // ---- 9. Reports volume (30 backdated candidates over the demo jobs) -------
  const reports = await seedDemoData();

  return {
    users: demoUsers.map((u) => ({ email: u.email, password: DEMO_PASSWORD, role: u.role })),
    jobs: 3,
    richCandidates: rich.length,
    reportCandidates: reports.candidates_created,
    publicTestUrl: `${appUrl}/test/${token}`,
    notes: [
      "Duyệt email 'Thư mời nhận việc' sẽ GỬI THẬT qua MS Graph tới bao.demo@example.com.",
      "Tài khoản quanly.demo có bước 'Trưởng phòng đề xuất' đang chờ (Bùi Văn Nam); bod.demo có bước BOD (Ngô Thị Yến).",
    ],
  };
}
