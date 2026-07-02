// Builds docs/presentations/bod-update-2026-04.pptx — Mắt Việt HR
// progress update for BOD (Ban Giám đốc).
//
// Run with:  node scripts/build-bod-update-slides.mjs
// Or:        npm run docs:bod-update
//
// Brand:     navy #13245C, yellow #FFC107.
// Layout:    16:9 wide (13.333 × 7.5 in).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";

// ─────────────────────────── Theme ────────────────────────────

const NAVY = "13245C";
const NAVY_DEEP = "0B1740";
const NAVY_SOFT = "1F3478";
const YELLOW = "FFC107";
const YELLOW_SOFT = "FFE082";
const WHITE = "FFFFFF";
const PAGE_BG = "FAFBFC";
const CARD_BG = "FFFFFF";
const BORDER = "E5E7EB";
const TEXT = "1F2937";
const TEXT_MUTED = "6B7280";
const TEXT_FAINT = "9CA3AF";

const SUCCESS = "10B981";
const WARN = "F59E0B";
const PROGRESS = "3B82F6";
const PENDING = "9CA3AF";
const RISK = "EF4444";

const FONT = "Calibri";
const FONT_TITLE = "Calibri";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

// ──────────────────────── Logo paths ─────────────────────────

const here = dirname(fileURLToPath(import.meta.url));
const LOGO_DARK = resolve(here, "..", "public", "brand", "MV6.png"); // for navy bg
const LOGO_LIGHT = resolve(here, "..", "public", "brand", "MV2.png"); // for white bg

// ───────────────────────── Helpers ───────────────────────────

function paintBackground(slide, color = PAGE_BG) {
  slide.background = { color };
}

/** Decorative top accent bar (yellow). */
function topAccent(slide, color = YELLOW, h = 0.08) {
  slide.addShape("rect", {
    x: 0, y: 0, w: SLIDE_W, h,
    fill: { color }, line: { type: "none" },
  });
}

/** Slide title strip — navy bar with white title + yellow underline. */
function slideHeader(slide, kicker, title) {
  slide.addShape("rect", {
    x: 0, y: 0, w: SLIDE_W, h: 1.15,
    fill: { color: NAVY }, line: { type: "none" },
  });
  // yellow underline under the navy strip
  slide.addShape("rect", {
    x: 0, y: 1.15, w: SLIDE_W, h: 0.05,
    fill: { color: YELLOW }, line: { type: "none" },
  });

  if (kicker) {
    slide.addText(kicker, {
      x: 0.6, y: 0.18, w: 12, h: 0.3,
      fontFace: FONT, fontSize: 12, color: YELLOW,
      bold: true, charSpacing: 4,
    });
  }
  slide.addText(title, {
    x: 0.6, y: 0.45, w: 12, h: 0.7,
    fontFace: FONT_TITLE, fontSize: 28, color: WHITE, bold: true,
  });

  // small logo top-right on navy strip
  try {
    slide.addImage({ path: LOGO_DARK, x: SLIDE_W - 1.3, y: 0.22, w: 0.85, h: 0.7, sizing: { type: "contain", w: 0.85, h: 0.7 } });
  } catch (_e) { /* ignore */ }
}

function pageFooter(slide, pageNo, total) {
  slide.addShape("rect", {
    x: 0, y: SLIDE_H - 0.35, w: SLIDE_W, h: 0.35,
    fill: { color: NAVY_DEEP }, line: { type: "none" },
  });
  slide.addText("Mắt Việt HR  •  Báo cáo tiến độ  •  Tháng 4/2026", {
    x: 0.4, y: SLIDE_H - 0.33, w: 8, h: 0.3,
    fontFace: FONT, fontSize: 9, color: YELLOW_SOFT, italic: true,
  });
  slide.addText(`${pageNo} / ${total}`, {
    x: SLIDE_W - 1.2, y: SLIDE_H - 0.33, w: 0.9, h: 0.3,
    fontFace: FONT, fontSize: 9, color: WHITE, align: "right", bold: true,
  });
}

/** Status pill — small rounded rectangle with text. */
function statusPill(slide, x, y, w, h, label, fillColor) {
  slide.addShape("roundRect", {
    x, y, w, h,
    fill: { color: fillColor },
    line: { type: "none" },
    rectRadius: 0.08,
  });
  slide.addText(label, {
    x, y, w, h,
    fontFace: FONT, fontSize: 9, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });
}

/** Card with title, optional kicker and body — auto sized. */
function card(slide, x, y, w, h, opts) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: opts.fill ?? CARD_BG },
    line: { color: opts.borderColor ?? BORDER, width: 0.75 },
  });
  // optional accent bar on the left
  if (opts.accentColor) {
    slide.addShape("rect", {
      x, y, w: 0.1, h,
      fill: { color: opts.accentColor }, line: { type: "none" },
    });
  }
}

// ───────────────────── Build deck ────────────────────────────

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 × 7.5
pres.author = "Sanh Võ";
pres.company = "Mắt Việt";
pres.title = "Mắt Việt HR — Cập nhật Ban Giám đốc";
pres.subject = "Báo cáo tiến độ phần mềm tuyển dụng nội bộ";

const TOTAL_SLIDES = 14;
let pageNo = 0;
const next = () => ++pageNo;

// ════════════════════ Slide 1 — Title ══════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide, NAVY);

  // background visual flair: yellow geometric accents
  slide.addShape("rect", {
    x: 0, y: 6.2, w: SLIDE_W, h: 0.05,
    fill: { color: YELLOW }, line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: -2, y: -2, w: 5, h: 5,
    fill: { color: NAVY_SOFT, transparency: 40 }, line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: SLIDE_W - 3.5, y: SLIDE_H - 3.5, w: 6, h: 6,
    fill: { color: NAVY_SOFT, transparency: 50 }, line: { type: "none" },
  });

  // Logo center
  try {
    slide.addImage({
      path: LOGO_DARK,
      x: SLIDE_W / 2 - 1.5, y: 1.2, w: 3, h: 2.2,
      sizing: { type: "contain", w: 3, h: 2.2 },
    });
  } catch (_e) {}

  slide.addText("MẮT VIỆT HR", {
    x: 0, y: 3.6, w: SLIDE_W, h: 0.7,
    fontFace: FONT_TITLE, fontSize: 44, bold: true, color: WHITE,
    align: "center", charSpacing: 8,
  });
  slide.addText("Hệ thống quản lý tuyển dụng thông minh", {
    x: 0, y: 4.3, w: SLIDE_W, h: 0.5,
    fontFace: FONT, fontSize: 20, italic: true, color: YELLOW_SOFT,
    align: "center",
  });

  // yellow accent bar
  slide.addShape("rect", {
    x: SLIDE_W / 2 - 1, y: 5.0, w: 2, h: 0.06,
    fill: { color: YELLOW }, line: { type: "none" },
  });

  slide.addText("Cập nhật Ban Giám đốc", {
    x: 0, y: 5.2, w: SLIDE_W, h: 0.5,
    fontFace: FONT, fontSize: 22, bold: true, color: WHITE,
    align: "center",
  });
  slide.addText("Báo cáo tiến độ — Tháng 4/2026", {
    x: 0, y: 5.7, w: SLIDE_W, h: 0.4,
    fontFace: FONT, fontSize: 14, color: YELLOW_SOFT, align: "center",
  });

  slide.addText("Trình bày: Sanh Võ  •  Phòng Dự án Sản phẩm", {
    x: 0, y: 6.4, w: SLIDE_W, h: 0.4,
    fontFace: FONT, fontSize: 11, color: WHITE, italic: true, align: "center",
  });

  next(); // 1
}

// ═══════════ Slide 2 — Tóm tắt điều hành ═════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "TÓM TẮT ĐIỀU HÀNH", "Bốn điểm chính cần biết hôm nay");

  const items = [
    {
      icon: "✓",
      iconColor: SUCCESS,
      title: "Vượt tiến độ ~2 tuần",
      body: "Phần lõi (database + nghiệp vụ) đã hoàn thiện sớm hơn kế hoạch ban đầu.",
    },
    {
      icon: "⚙",
      iconColor: PROGRESS,
      title: "Đang ở giai đoạn cài đặt database & backend",
      body: "Toàn bộ logic nghiệp vụ đã chạy được. Giao diện sẽ được tinh chỉnh ở giai đoạn kế tiếp.",
    },
    {
      icon: "🔗",
      iconColor: WARN,
      title: "Cần phối hợp với IT để mở khóa tự động hóa email & lịch",
      body: "Cấu hình Microsoft 365 / Azure AD là điểm nghẽn chính của giai đoạn tiếp theo.",
    },
    {
      icon: "▶",
      iconColor: NAVY,
      title: "Cam kết demo sớm cho BOD trong 2 – 3 tuần",
      body: "Phiên bản demo nội bộ với dữ liệu thật, đầy đủ luồng từ nhận CV → chấm điểm → phỏng vấn → phê duyệt.",
    },
  ];

  let y = 1.55;
  for (const it of items) {
    const cardH = 1.25;
    card(slide, 0.6, y, 12.1, cardH, { accentColor: it.iconColor });
    slide.addText(it.icon, {
      x: 0.85, y: y + 0.2, w: 0.7, h: 0.85,
      fontFace: FONT, fontSize: 36, bold: true, color: it.iconColor,
      align: "center", valign: "middle",
    });
    slide.addText(it.title, {
      x: 1.7, y: y + 0.18, w: 10.8, h: 0.45,
      fontFace: FONT_TITLE, fontSize: 18, bold: true, color: NAVY,
    });
    slide.addText(it.body, {
      x: 1.7, y: y + 0.65, w: 10.8, h: 0.55,
      fontFace: FONT, fontSize: 13, color: TEXT,
    });
    y += cardH + 0.12;
  }

  pageFooter(slide, next(), TOTAL_SLIDES); // 2
}

// ═══════════════ Slide 3 — Bối cảnh ═════════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "BỐI CẢNH", "Vì sao chúng ta cần phần mềm tuyển dụng riêng");

  // Two columns: pain points | impact
  // Left col: pain points list
  card(slide, 0.6, 1.55, 6.0, 5.4, { accentColor: RISK });
  slide.addText("Khó khăn HR đang gặp", {
    x: 0.85, y: 1.7, w: 5.7, h: 0.4,
    fontFace: FONT_TITLE, fontSize: 16, bold: true, color: NAVY,
  });

  const pains = [
    "Quản lý CV trên Excel + Outlook + Zalo + giấy — dễ thất lạc.",
    "Phụ thuộc trí nhớ cá nhân — ai đang ở vòng nào, ai đã trả lời.",
    "Phản hồi ứng viên chậm 7 – 10 ngày, mất ứng viên giỏi.",
    "Trưởng phòng và HR không cùng nhìn vào một nguồn dữ liệu.",
    "BOD không có số liệu khi cần ra quyết định nhân sự.",
    "Mỗi vòng phỏng vấn = một file Word + một email chuỗi dài.",
  ];
  let py = 2.2;
  for (const p of pains) {
    slide.addText("•", {
      x: 0.85, y: py, w: 0.3, h: 0.4,
      fontFace: FONT, fontSize: 18, color: RISK, bold: true,
    });
    slide.addText(p, {
      x: 1.15, y: py, w: 5.3, h: 0.6,
      fontFace: FONT, fontSize: 13, color: TEXT,
    });
    py += 0.7;
  }

  // Right col: impact metrics
  card(slide, 6.85, 1.55, 5.85, 5.4, { accentColor: NAVY });
  slide.addText("Hệ quả với hoạt động kinh doanh", {
    x: 7.1, y: 1.7, w: 5.5, h: 0.4,
    fontFace: FONT_TITLE, fontSize: 16, bold: true, color: NAVY,
  });

  const impacts = [
    { num: "≈ 30%",   label: "thời gian HR dành cho việc gõ tay, tìm CV, hẹn lịch" },
    { num: "7 – 10",  label: "ngày trung bình từ lúc nhận CV đến lúc phản hồi" },
    { num: "0",       label: "báo cáo hiệu quả tuyển dụng theo kênh / theo vị trí" },
    { num: "≥ 5",     label: "công cụ rời đang dùng song song (Excel, Outlook, Zalo, Word, ổ đĩa)" },
  ];
  let iy = 2.25;
  for (const imp of impacts) {
    slide.addText(imp.num, {
      x: 7.1, y: iy, w: 1.8, h: 0.7,
      fontFace: FONT_TITLE, fontSize: 28, bold: true, color: NAVY,
    });
    slide.addText(imp.label, {
      x: 9.0, y: iy + 0.05, w: 3.6, h: 0.7,
      fontFace: FONT, fontSize: 12, color: TEXT,
    });
    iy += 1.0;
  }

  // tagline
  slide.addText("→ Phần mềm này giúp HR tập trung vào việc đánh giá người, không phải chạy giấy tờ.", {
    x: 7.1, y: 6.45, w: 5.5, h: 0.4,
    fontFace: FONT, fontSize: 12, italic: true, color: NAVY_SOFT, bold: true,
  });

  pageFooter(slide, next(), TOTAL_SLIDES); // 3
}

// ═══════════════ Slide 4 — Tầm nhìn sản phẩm ═══════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "TẦM NHÌN SẢN PHẨM", "Một nơi duy nhất, từ CV đến quyết định tuyển");

  // Hero statement
  slide.addShape("rect", {
    x: 0.6, y: 1.55, w: 12.1, h: 1.4,
    fill: { color: NAVY }, line: { type: "none" },
  });
  slide.addShape("rect", {
    x: 0.6, y: 2.9, w: 12.1, h: 0.05,
    fill: { color: YELLOW }, line: { type: "none" },
  });
  slide.addText(
    "“Phần mềm tuyển dụng nội bộ Mắt Việt — Vietnamese-first, dùng AI để chấm điểm CV theo đúng tiêu chí của từng vị trí, gắn liền với quy trình thực tế của chị Hương và các Trưởng phòng.”",
    {
      x: 0.85, y: 1.65, w: 11.6, h: 1.2,
      fontFace: FONT, fontSize: 16, italic: true, color: WHITE,
      valign: "middle",
    },
  );

  // 3 outcome columns
  const outcomes = [
    {
      kpi: "≥ 50%",
      label: "tiết kiệm thời gian sàng lọc CV",
      detail: "AI chấm 6 tiêu chí, HR chỉ duyệt + xếp hạng top 5–10 ứng viên.",
    },
    {
      kpi: "< 48h",
      label: "phản hồi ứng viên kể từ khi nhận CV",
      detail: "Email tự động + lịch phỏng vấn tự đồng bộ với Outlook.",
    },
    {
      kpi: "100%",
      label: "minh bạch — BOD nhìn được mọi vòng phê duyệt",
      detail: "Lịch sử ai duyệt, ai từ chối, vì sao — lưu vĩnh viễn.",
    },
  ];

  const colW = (12.1 - 0.4) / 3;
  for (let i = 0; i < outcomes.length; i++) {
    const x = 0.6 + i * (colW + 0.2);
    const o = outcomes[i];
    card(slide, x, 3.3, colW, 3.7, { accentColor: YELLOW });
    slide.addText(o.kpi, {
      x: x + 0.1, y: 3.5, w: colW - 0.2, h: 1.0,
      fontFace: FONT_TITLE, fontSize: 44, bold: true, color: NAVY,
      align: "center",
    });
    slide.addShape("rect", {
      x: x + colW / 2 - 0.5, y: 4.55, w: 1, h: 0.04,
      fill: { color: YELLOW }, line: { type: "none" },
    });
    slide.addText(o.label, {
      x: x + 0.2, y: 4.7, w: colW - 0.4, h: 0.8,
      fontFace: FONT_TITLE, fontSize: 14, bold: true, color: TEXT,
      align: "center",
    });
    slide.addText(o.detail, {
      x: x + 0.2, y: 5.55, w: colW - 0.4, h: 1.2,
      fontFace: FONT, fontSize: 11, color: TEXT_MUTED,
      align: "center",
    });
  }

  pageFooter(slide, next(), TOTAL_SLIDES); // 4
}

// ═══════════════ Slide 5 — Người dùng ══════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "NGƯỜI DÙNG", "Bốn nhóm — mỗi nhóm có giao diện riêng phù hợp với cách họ làm việc");

  const personas = [
    {
      role: "HR Staff",
      name: "Chị Bùi Thị Hương",
      desc: "Người dùng chính. 3 năm kinh nghiệm. Ưu tiên: dễ nhập liệu, ít click, tiếng Việt rõ ràng.",
      tasks: ["Đăng tin tuyển dụng", "Sàng lọc CV", "Hẹn lịch phỏng vấn", "Gửi offer"],
      color: NAVY,
    },
    {
      role: "Hiring Manager",
      name: "Trưởng phòng",
      desc: "Bận rộn, dùng điện thoại trên cửa hàng. Chỉ vào app khi có việc cần xử lý.",
      tasks: ["Xem CV được giao", "Chấm phỏng vấn", "Đề xuất offer/từ chối"],
      color: PROGRESS,
    },
    {
      role: "BOD",
      name: "Ban Giám đốc",
      desc: "Phê duyệt vị trí cấp Quản lý. Thỉnh thoảng vào hệ thống — UI phải đơn giản tối đa.",
      tasks: ["Xem hồ sơ tóm tắt", "Phê duyệt / từ chối", "Xem báo cáo tổng quan"],
      color: SUCCESS,
    },
    {
      role: "Tập đoàn",
      name: "Cấp Tập đoàn",
      desc: "Phê duyệt cuối cùng cho vị trí cấp Quản lý cao. Cùng UI với BOD, ít quyền hơn.",
      tasks: ["Phê duyệt cuối", "Xem audit log"],
      color: YELLOW,
    },
  ];

  const w = (12.1 - 0.6) / 4;
  for (let i = 0; i < personas.length; i++) {
    const x = 0.6 + i * (w + 0.2);
    const p = personas[i];

    // header strip
    slide.addShape("rect", {
      x, y: 1.55, w, h: 0.7,
      fill: { color: p.color }, line: { type: "none" },
    });
    slide.addText(p.role, {
      x: x + 0.15, y: 1.6, w: w - 0.3, h: 0.32,
      fontFace: FONT, fontSize: 10, color: WHITE, bold: true, charSpacing: 3,
    });
    slide.addText(p.name, {
      x: x + 0.15, y: 1.92, w: w - 0.3, h: 0.32,
      fontFace: FONT_TITLE, fontSize: 14, color: WHITE, bold: true,
    });

    // body card
    card(slide, x, 2.25, w, 4.7, {});
    slide.addText(p.desc, {
      x: x + 0.2, y: 2.4, w: w - 0.4, h: 1.6,
      fontFace: FONT, fontSize: 11, color: TEXT, italic: true,
    });
    slide.addText("Công việc chính:", {
      x: x + 0.2, y: 4.0, w: w - 0.4, h: 0.3,
      fontFace: FONT, fontSize: 10, color: TEXT_MUTED, bold: true, charSpacing: 2,
    });
    let ty = 4.35;
    for (const t of p.tasks) {
      slide.addText(`✓  ${t}`, {
        x: x + 0.2, y: ty, w: w - 0.4, h: 0.32,
        fontFace: FONT, fontSize: 11, color: NAVY, bold: false,
      });
      ty += 0.38;
    }
  }

  pageFooter(slide, next(), TOTAL_SLIDES); // 5
}

// ════════════ Slide 6 — Lộ trình 11 nhóm ═════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "LỘ TRÌNH SẢN PHẨM", "11 nhóm tính năng — chia theo trình tự phụ thuộc");

  const groups = [
    { id: "G1",  name: "Nền tảng",                    status: "done" },
    { id: "G2",  name: "Quản lý vị trí tuyển dụng",   status: "done" },
    { id: "G3",  name: "Ứng viên + Tải CV",           status: "done" },
    { id: "G4",  name: "Chấm điểm AI (Gemini)",       status: "done" },
    { id: "G5",  name: "Pipeline (Kanban)",           status: "done" },
    { id: "G6",  name: "Email tự động",               status: "blocked-it" },
    { id: "G7",  name: "Lịch & Phỏng vấn (Outlook)",  status: "blocked-it" },
    { id: "G8",  name: "Đánh giá phỏng vấn + Phê duyệt", status: "done" },
    { id: "G9",  name: "Bài test + Nhập CSV TopCV",   status: "next" },
    { id: "G10", name: "Báo cáo & Phân tích",         status: "next" },
    { id: "G11", name: "Tinh chỉnh + Khởi chạy",      status: "future" },
  ];

  const STATUS_META = {
    "done":        { label: "HOÀN THIỆN",     color: SUCCESS },
    "in-progress": { label: "ĐANG LÀM",        color: PROGRESS },
    "blocked-it":  { label: "CHỜ IT",          color: WARN },
    "next":        { label: "TIẾP THEO",       color: NAVY },
    "future":      { label: "TƯƠNG LAI",       color: TEXT_FAINT },
  };

  // 4 cols × 3 rows grid
  const cols = 4;
  const cellW = (12.1 - 0.6) / cols;
  const cellH = 1.45;
  for (let i = 0; i < groups.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = 0.6 + c * (cellW + 0.2);
    const y = 1.5 + r * (cellH + 0.15);
    const g = groups[i];
    const meta = STATUS_META[g.status];

    card(slide, x, y, cellW, cellH, { accentColor: meta.color });
    slide.addText(g.id, {
      x: x + 0.2, y: y + 0.18, w: 1, h: 0.4,
      fontFace: FONT_TITLE, fontSize: 22, bold: true, color: meta.color,
    });
    slide.addText(g.name, {
      x: x + 0.2, y: y + 0.65, w: cellW - 0.4, h: 0.5,
      fontFace: FONT, fontSize: 12, color: TEXT, bold: true,
    });
    statusPill(slide, x + cellW - 1.45, y + 0.18, 1.25, 0.3, meta.label, meta.color);
  }

  // legend
  slide.addText("●  Hoàn thiện ở backend     ●  Chờ IT phối hợp     ●  Tiếp theo trong 2–3 tuần     ●  Sau giai đoạn demo", {
    x: 0.6, y: SLIDE_H - 0.85, w: 12.1, h: 0.4,
    fontFace: FONT, fontSize: 10, color: TEXT_MUTED, italic: true,
  });

  pageFooter(slide, next(), TOTAL_SLIDES); // 6
}

// ══════════════ Slide 7 — Tiến độ hiện tại ════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "TIẾN ĐỘ HIỆN TẠI", "Đang ở giai đoạn cài đặt database + nghiệp vụ — vượt tiến độ ~2 tuần");

  // Big progress visual
  const stages = [
    { label: "Phân tích",      done: true, soon: false },
    { label: "Database",       done: true, soon: false },
    { label: "Backend (logic)", done: true, soon: false },
    { label: "UI tinh chỉnh",  done: false, soon: true },
    { label: "Tích hợp IT",    done: false, soon: true },
    { label: "Demo BOD",       done: false, soon: true },
    { label: "Khởi chạy",      done: false, soon: false },
  ];

  const trackY = 2.5;
  const trackX = 0.8;
  const trackW = 11.7;
  const stageW = trackW / stages.length;

  // background track
  slide.addShape("rect", {
    x: trackX, y: trackY + 0.55, w: trackW, h: 0.12,
    fill: { color: BORDER }, line: { type: "none" },
  });
  // completed track (3/7)
  slide.addShape("rect", {
    x: trackX, y: trackY + 0.55, w: stageW * 3 - 0.05, h: 0.12,
    fill: { color: SUCCESS }, line: { type: "none" },
  });

  // stage markers
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const cx = trackX + (i + 0.5) * stageW;
    const dotColor = s.done ? SUCCESS : (s.soon ? PROGRESS : TEXT_FAINT);
    slide.addShape("ellipse", {
      x: cx - 0.22, y: trackY + 0.4, w: 0.45, h: 0.45,
      fill: { color: dotColor }, line: { color: WHITE, width: 3 },
    });
    if (s.done) {
      slide.addText("✓", {
        x: cx - 0.22, y: trackY + 0.4, w: 0.45, h: 0.45,
        fontFace: FONT, fontSize: 16, bold: true, color: WHITE,
        align: "center", valign: "middle",
      });
    }
    slide.addText(s.label, {
      x: cx - stageW / 2 + 0.1, y: trackY + 1.0, w: stageW - 0.2, h: 0.4,
      fontFace: FONT, fontSize: 10, color: s.done ? NAVY : TEXT_MUTED,
      bold: s.done, align: "center",
    });
  }

  // "We are here" arrow
  slide.addText("Đang ở đây ▼", {
    x: trackX + 2.5 * stageW - 0.6, y: trackY - 0.2, w: 1.4, h: 0.35,
    fontFace: FONT_TITLE, fontSize: 13, bold: true, color: NAVY, italic: true, align: "center",
  });

  // Stats row
  const statsY = 4.6;
  const stats = [
    { num: "8 / 11", label: "Nhóm tính năng đã hoàn thiện ở backend", color: SUCCESS },
    { num: "+2 tuần", label: "Vượt tiến độ so với kế hoạch ban đầu", color: NAVY },
    { num: "2 nhóm", label: "Đang chờ IT (G6 Email + G7 Lịch)", color: WARN },
    { num: "3 tuần", label: "Đến mốc demo BOD đã cam kết", color: PROGRESS },
  ];
  const sw = (12.1 - 0.6) / 4;
  for (let i = 0; i < stats.length; i++) {
    const x = 0.6 + i * (sw + 0.2);
    const s = stats[i];
    card(slide, x, statsY, sw, 1.95, { accentColor: s.color });
    slide.addText(s.num, {
      x: x + 0.2, y: statsY + 0.15, w: sw - 0.4, h: 0.85,
      fontFace: FONT_TITLE, fontSize: 30, bold: true, color: s.color, align: "center",
    });
    slide.addText(s.label, {
      x: x + 0.2, y: statsY + 1.0, w: sw - 0.4, h: 0.85,
      fontFace: FONT, fontSize: 11, color: TEXT, align: "center",
    });
  }

  pageFooter(slide, next(), TOTAL_SLIDES); // 7
}

// ════════════ Slide 8 — Backend đã hoàn thiện ════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "ĐÃ HOÀN THIỆN Ở BACKEND", "8 trên 11 nhóm — toàn bộ nghiệp vụ lõi đã chạy được");

  const modules = [
    { id: "G1", name: "Đăng nhập & Phân quyền",     bullets: ["Supabase Auth + RLS theo vai trò", "5 vai trò: HR / Trưởng phòng / BOD / Tập đoàn / Admin"] },
    { id: "G2", name: "Quản lý vị trí tuyển dụng",  bullets: ["Tạo/sửa JD, mức lương, trọng số chấm", "5 nhóm vị trí với mẫu sẵn (sales / khúc xạ / quản lý...)"] },
    { id: "G3", name: "Hồ sơ ứng viên + Tải CV",    bullets: ["Tải CV PDF an toàn", "Phân tích ngày tháng + thông tin liên hệ"] },
    { id: "G4", name: "Chấm điểm AI (Gemini)",      bullets: ["6 tiêu chí riêng cho từng nhóm vị trí", "Bằng chứng được trích xuất từ CV — minh bạch"] },
    { id: "G5", name: "Pipeline Kanban",            bullets: ["16 vòng từ “Mới” → “Nhận việc”", "Kéo thả giữa các vòng để chuyển trạng thái"] },
    { id: "G8", name: "Phỏng vấn + Phê duyệt",      bullets: ["Lịch phỏng vấn + form đánh giá 6 tiêu chí", "Hai bộ duyệt: Nhân viên (3 bước) / Quản lý (4 bước)"] },
  ];

  const cols = 3;
  const cellW = (12.1 - 0.4) / cols;
  const cellH = 2.55;
  for (let i = 0; i < modules.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = 0.6 + c * (cellW + 0.2);
    const y = 1.55 + r * (cellH + 0.2);
    const m = modules[i];
    card(slide, x, y, cellW, cellH, { accentColor: SUCCESS });

    // header pill
    slide.addText(m.id, {
      x: x + 0.2, y: y + 0.15, w: 0.7, h: 0.4,
      fontFace: FONT_TITLE, fontSize: 14, bold: true, color: SUCCESS,
    });
    slide.addText(m.name, {
      x: x + 0.85, y: y + 0.15, w: cellW - 1.0, h: 0.5,
      fontFace: FONT_TITLE, fontSize: 14, bold: true, color: NAVY,
    });
    // bullets
    let by = y + 0.85;
    for (const b of m.bullets) {
      slide.addText("✓", {
        x: x + 0.25, y: by, w: 0.3, h: 0.3,
        fontFace: FONT, fontSize: 11, bold: true, color: SUCCESS,
      });
      slide.addText(b, {
        x: x + 0.55, y: by, w: cellW - 0.75, h: 0.7,
        fontFace: FONT, fontSize: 11, color: TEXT,
      });
      by += 0.7;
    }
  }

  pageFooter(slide, next(), TOTAL_SLIDES); // 8
}

// ═══════════ Slide 9 — Quyết định sản phẩm chính ════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "QUYẾT ĐỊNH SẢN PHẨM CHÍNH", "Năm lựa chọn quan trọng đã chốt trong giai đoạn này");

  const decisions = [
    {
      title: "Tiếng Việt — không có chế độ tiếng Anh",
      body: "100% giao diện tiếng Việt. Phù hợp với năng lực của HR và Trưởng phòng. Tránh chi phí dịch + bảo trì 2 ngôn ngữ.",
    },
    {
      title: "Ứng viên không cần tài khoản",
      body: "Mọi giao tiếp với ứng viên qua email. Giảm rào cản đăng ký, không phải nuôi thêm hệ thống tài khoản ngoài.",
    },
    {
      title: "AI chấm điểm hai vòng + tách biệt với trọng số",
      body: "Vòng 1: AI đọc CV. Vòng 2: AI chấm 6 tiêu chí + trích bằng chứng. Trọng số tính ở lúc xem — đổi trọng số không cần chấm lại.",
    },
    {
      title: "Hai bộ duyệt: Nhân viên / Quản lý",
      body: "Nhân viên: HR → Trưởng phòng → Chốt lương (3 bước).\nQuản lý: HR → Trưởng phòng → BOD → Tập đoàn (4 bước).",
    },
    {
      title: "CV PDF trước, DOCX sau",
      body: "Giai đoạn này chỉ nhận PDF (đơn giản, ổn định). DOCX sẽ thêm khi IT triển khai dịch vụ chuyển đổi (Fly.io).",
    },
  ];

  let y = 1.55;
  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i];
    const cardH = 1.0;
    card(slide, 0.6, y, 12.1, cardH, { accentColor: NAVY });
    // number circle
    slide.addShape("ellipse", {
      x: 0.85, y: y + 0.2, w: 0.6, h: 0.6,
      fill: { color: NAVY }, line: { type: "none" },
    });
    slide.addText(`${i + 1}`, {
      x: 0.85, y: y + 0.2, w: 0.6, h: 0.6,
      fontFace: FONT_TITLE, fontSize: 22, bold: true, color: YELLOW,
      align: "center", valign: "middle",
    });
    slide.addText(d.title, {
      x: 1.6, y: y + 0.13, w: 10.9, h: 0.4,
      fontFace: FONT_TITLE, fontSize: 14, bold: true, color: NAVY,
    });
    slide.addText(d.body, {
      x: 1.6, y: y + 0.5, w: 10.9, h: 0.5,
      fontFace: FONT, fontSize: 11, color: TEXT,
    });
    y += cardH + 0.05;
  }

  pageFooter(slide, next(), TOTAL_SLIDES); // 9
}

// ═══════════ Slide 10 — Spotlight AI Scoring ════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide, NAVY);
  // yellow corner flair
  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.08, fill: { color: YELLOW }, line: { type: "none" } });
  slide.addShape("rect", { x: 0, y: SLIDE_H - 0.4, w: SLIDE_W, h: 0.05, fill: { color: YELLOW }, line: { type: "none" } });

  // kicker + title in white
  slide.addText("ĐIỂM KHÁC BIỆT", {
    x: 0.6, y: 0.4, w: 12, h: 0.3,
    fontFace: FONT, fontSize: 12, color: YELLOW, bold: true, charSpacing: 5,
  });
  slide.addText("Chấm điểm AI có bằng chứng — không phải “điểm ma”", {
    x: 0.6, y: 0.75, w: 12, h: 0.6,
    fontFace: FONT_TITLE, fontSize: 26, bold: true, color: WHITE,
  });

  // Six criteria pills
  const criteria = [
    { name: "Phù hợp ngành",       weight: "20%", color: YELLOW },
    { name: "Kỹ năng chuyên môn", weight: "25%", color: YELLOW_SOFT },
    { name: "Kinh nghiệm việc",    weight: "20%", color: SUCCESS },
    { name: "Số năm kinh nghiệm", weight: "10%", color: PROGRESS },
    { name: "Học vấn",            weight: "15%", color: WARN },
    { name: "Vị trí địa lý",      weight: "10%", color: TEXT_FAINT },
  ];

  const cardX = 0.6;
  const cardY = 1.7;
  const cardW = 6.2;
  const cardH = 5.3;

  // Left card: how it works
  slide.addShape("rect", {
    x: cardX, y: cardY, w: cardW, h: cardH,
    fill: { color: WHITE }, line: { type: "none" },
  });
  slide.addText("Cách hệ thống chấm điểm", {
    x: cardX + 0.3, y: cardY + 0.2, w: cardW - 0.6, h: 0.4,
    fontFace: FONT_TITLE, fontSize: 16, bold: true, color: NAVY,
  });

  const steps = [
    { t: "Vòng 1 — Đọc & cấu trúc CV", b: "AI bóc tách thông tin: kinh nghiệm, học vấn, kỹ năng, năm tốt nghiệp..." },
    { t: "Vòng 2 — Chấm 6 tiêu chí",   b: "AI cho điểm 0–100 cho mỗi tiêu chí + trích lời CV làm bằng chứng." },
    { t: "Xác thực bằng chứng",         b: "Hệ thống đối chiếu lại với CV gốc — đánh dấu ✓ thật / ⚠ ngờ ngờ." },
    { t: "Cộng điểm theo trọng số",     b: "HR có thể đổi trọng số bất cứ lúc nào — điểm tổng cập nhật ngay, không cần chấm lại." },
  ];
  let sy = cardY + 0.85;
  for (let i = 0; i < steps.length; i++) {
    slide.addShape("ellipse", {
      x: cardX + 0.25, y: sy + 0.05, w: 0.4, h: 0.4,
      fill: { color: NAVY }, line: { type: "none" },
    });
    slide.addText(`${i + 1}`, {
      x: cardX + 0.25, y: sy + 0.05, w: 0.4, h: 0.4,
      fontFace: FONT_TITLE, fontSize: 14, bold: true, color: YELLOW,
      align: "center", valign: "middle",
    });
    slide.addText(steps[i].t, {
      x: cardX + 0.75, y: sy, w: cardW - 1.0, h: 0.35,
      fontFace: FONT_TITLE, fontSize: 12, bold: true, color: NAVY,
    });
    slide.addText(steps[i].b, {
      x: cardX + 0.75, y: sy + 0.32, w: cardW - 1.0, h: 0.7,
      fontFace: FONT, fontSize: 10.5, color: TEXT,
    });
    sy += 1.05;
  }

  // Right card: 6 criteria
  const r2x = cardX + cardW + 0.3;
  const r2w = SLIDE_W - r2x - 0.6;
  slide.addShape("rect", {
    x: r2x, y: cardY, w: r2w, h: cardH,
    fill: { color: WHITE }, line: { type: "none" },
  });
  slide.addText("6 tiêu chí mặc định (vị trí Sales)", {
    x: r2x + 0.3, y: cardY + 0.2, w: r2w - 0.6, h: 0.4,
    fontFace: FONT_TITLE, fontSize: 16, bold: true, color: NAVY,
  });

  let cy = cardY + 0.85;
  for (const cr of criteria) {
    slide.addText(cr.name, {
      x: r2x + 0.3, y: cy, w: r2w - 1.5, h: 0.3,
      fontFace: FONT_TITLE, fontSize: 12, bold: true, color: TEXT,
    });
    slide.addText(cr.weight, {
      x: r2x + r2w - 1.0, y: cy, w: 0.7, h: 0.3,
      fontFace: FONT_TITLE, fontSize: 12, bold: true, color: NAVY, align: "right",
    });
    // bar
    slide.addShape("rect", {
      x: r2x + 0.3, y: cy + 0.32, w: r2w - 0.6, h: 0.18,
      fill: { color: BORDER }, line: { type: "none" },
    });
    const pct = parseInt(cr.weight, 10) / 25; // out of largest weight (25%)
    slide.addShape("rect", {
      x: r2x + 0.3, y: cy + 0.32, w: (r2w - 0.6) * pct, h: 0.18,
      fill: { color: cr.color }, line: { type: "none" },
    });
    cy += 0.65;
  }

  slide.addText("→ HR đổi trọng số: ngay lập tức danh sách ứng viên xếp lại — KHÔNG tốn thêm chi phí AI.", {
    x: r2x + 0.3, y: cardY + cardH - 0.55, w: r2w - 0.6, h: 0.4,
    fontFace: FONT, fontSize: 10, italic: true, color: NAVY_SOFT, bold: true,
  });

  pageFooter(slide, next(), TOTAL_SLIDES); // 10
}

// ════════════ Slide 11 — Phối hợp với IT ═════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide, WARN);
  slideHeader(slide, "PHỐI HỢP VỚI IT", "Điểm nghẽn duy nhất của giai đoạn tiếp theo — cần BOD đỡ thúc đẩy");

  // Why we need IT — top callout
  slide.addShape("rect", {
    x: 0.6, y: 1.55, w: 12.1, h: 0.85,
    fill: { color: "FEF3C7" }, line: { color: WARN, width: 1 },
  });
  slide.addText("⚠", {
    x: 0.8, y: 1.65, w: 0.5, h: 0.7,
    fontFace: FONT, fontSize: 28, color: WARN, valign: "middle",
  });
  slide.addText(
    "Hai nhóm tính năng (G6 Email tự động + G7 Lịch & Phỏng vấn) phụ thuộc vào việc IT cấu hình Microsoft 365 / Azure AD cho công ty. Đây là việc IT làm 1 lần (~3 ngày), sau đó hệ thống chạy hoàn toàn tự động.",
    {
      x: 1.4, y: 1.6, w: 11.0, h: 0.75,
      fontFace: FONT, fontSize: 12, color: TEXT, valign: "middle",
    },
  );

  // What we need from IT — checklist
  card(slide, 0.6, 2.55, 6.0, 4.4, { accentColor: WARN });
  slide.addText("Việc IT cần làm", {
    x: 0.85, y: 2.7, w: 5.7, h: 0.4,
    fontFace: FONT_TITLE, fontSize: 16, bold: true, color: NAVY,
  });
  const itTasks = [
    "Tạo hộp thư hr@matkinh.com.vn (Microsoft 365)",
    "Đăng ký ứng dụng trong Azure AD (Entra ID)",
    "Cấp quyền Mail.Send / Calendars.ReadWrite cho ứng dụng",
    "Tạo Application Access Policy giới hạn quyền vào hộp thư HR",
    "Cấu hình SPF / DKIM / DMARC cho domain matkinh.com.vn",
    "Bàn giao Application ID + Client Secret cho Sanh",
  ];
  let itY = 3.2;
  for (const t of itTasks) {
    slide.addText("☐", {
      x: 0.85, y: itY, w: 0.3, h: 0.32,
      fontFace: FONT, fontSize: 14, color: WARN, bold: true,
    });
    slide.addText(t, {
      x: 1.15, y: itY, w: 5.3, h: 0.4,
      fontFace: FONT, fontSize: 11, color: TEXT,
    });
    itY += 0.55;
  }

  // What we already prepared — right card
  card(slide, 6.85, 2.55, 5.85, 4.4, { accentColor: SUCCESS });
  slide.addText("Đã chuẩn bị sẵn", {
    x: 7.1, y: 2.7, w: 5.5, h: 0.4,
    fontFace: FONT_TITLE, fontSize: 16, bold: true, color: NAVY,
  });
  const ready = [
    { t: "Tài liệu hướng dẫn IT — tiếng Việt", d: "docs/integrations/ms-graph-it-setup.vi.md (307 dòng, có script PowerShell test)" },
    { t: "Phiếu thông tin HR — chị Hương điền", d: "docs/onboarding/hr-prefill-form.vi.docx (mẫu Word có sẵn)" },
    { t: "Toàn bộ code email + lịch", d: "Đã viết & test ở môi trường giả lập, chỉ cần thông tin IT là chạy thật được" },
    { t: "Kế hoạch xác minh sau khi IT bàn giao", d: "Test gửi 1 email + đặt 1 lịch phỏng vấn thử trong vòng 1 giờ sau khi nhận khóa" },
  ];
  let ry = 3.25;
  for (const r of ready) {
    slide.addText("✓", {
      x: 7.1, y: ry, w: 0.3, h: 0.32,
      fontFace: FONT, fontSize: 14, color: SUCCESS, bold: true,
    });
    slide.addText(r.t, {
      x: 7.4, y: ry, w: 5.2, h: 0.32,
      fontFace: FONT_TITLE, fontSize: 12, bold: true, color: NAVY,
    });
    slide.addText(r.d, {
      x: 7.4, y: ry + 0.32, w: 5.2, h: 0.5,
      fontFace: FONT, fontSize: 10, color: TEXT_MUTED, italic: true,
    });
    ry += 0.85;
  }

  // BOD ask
  slide.addShape("rect", {
    x: 0.6, y: 7.05, w: 12.1, h: 0.4,
    fill: { color: NAVY }, line: { type: "none" },
  });
  slide.addText(
    "ĐỀ NGHỊ BOD:  giao IT chốt lịch triển khai trong tuần tới — sau đó 1 tuần là xong G6 + G7.",
    {
      x: 0.6, y: 7.05, w: 12.1, h: 0.4,
      fontFace: FONT_TITLE, fontSize: 12, bold: true, color: YELLOW,
      align: "center", valign: "middle",
    },
  );

  pageFooter(slide, next(), TOTAL_SLIDES); // 11
}

// ════════════ Slide 12 — Lịch trình demo ════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "CAM KẾT DEMO SỚM", "Hai cột mốc — bất kể IT có phối hợp đúng hạn hay không");

  // Two phases as big cards
  // Phase 1 — Demo nội bộ (no IT dependency)
  card(slide, 0.6, 1.55, 5.95, 5.4, { accentColor: SUCCESS });
  // header strip
  slide.addShape("rect", {
    x: 0.6, y: 1.55, w: 5.95, h: 0.7,
    fill: { color: SUCCESS }, line: { type: "none" },
  });
  slide.addText("PHA 1 — DEMO NỘI BỘ", {
    x: 0.85, y: 1.6, w: 5.5, h: 0.3,
    fontFace: FONT, fontSize: 11, bold: true, color: WHITE, charSpacing: 3,
  });
  slide.addText("Trong vòng 2 tuần", {
    x: 0.85, y: 1.92, w: 5.5, h: 0.3,
    fontFace: FONT_TITLE, fontSize: 16, bold: true, color: WHITE,
  });

  slide.addText("Sẽ trình diễn:", {
    x: 0.85, y: 2.45, w: 5.5, h: 0.4,
    fontFace: FONT_TITLE, fontSize: 13, bold: true, color: NAVY,
  });

  const phase1 = [
    "Tạo vị trí tuyển dụng (JD + trọng số chấm)",
    "Tải CV PDF thật của ứng viên Mắt Việt",
    "AI chấm điểm + trích bằng chứng — TRỰC TIẾP trên màn hình",
    "Đổi trọng số → danh sách xếp lại tức thì",
    "Kéo thả ứng viên qua các vòng pipeline",
    "Form đánh giá phỏng vấn 6 tiêu chí",
    "Phê duyệt 4 bước cho vị trí Quản lý",
  ];
  let p1y = 2.9;
  for (const p of phase1) {
    slide.addText("✓", {
      x: 0.85, y: p1y, w: 0.3, h: 0.32,
      fontFace: FONT, fontSize: 12, bold: true, color: SUCCESS,
    });
    slide.addText(p, {
      x: 1.15, y: p1y, w: 5.3, h: 0.4,
      fontFace: FONT, fontSize: 11, color: TEXT,
    });
    p1y += 0.5;
  }

  // Phase 2 — Demo đầy đủ (after IT)
  card(slide, 6.75, 1.55, 5.95, 5.4, { accentColor: PROGRESS });
  slide.addShape("rect", {
    x: 6.75, y: 1.55, w: 5.95, h: 0.7,
    fill: { color: PROGRESS }, line: { type: "none" },
  });
  slide.addText("PHA 2 — DEMO ĐẦY ĐỦ", {
    x: 7.0, y: 1.6, w: 5.5, h: 0.3,
    fontFace: FONT, fontSize: 11, bold: true, color: WHITE, charSpacing: 3,
  });
  slide.addText("Trong vòng 4 tuần (sau khi IT bàn giao)", {
    x: 7.0, y: 1.92, w: 5.5, h: 0.3,
    fontFace: FONT_TITLE, fontSize: 14, bold: true, color: WHITE,
  });

  slide.addText("Bổ sung thêm:", {
    x: 7.0, y: 2.45, w: 5.5, h: 0.4,
    fontFace: FONT_TITLE, fontSize: 13, bold: true, color: NAVY,
  });

  const phase2 = [
    "Email tự động qua hộp thư hr@matkinh.com.vn",
    "Đặt lịch phỏng vấn — tự đồng bộ Outlook & Teams",
    "Link Microsoft Teams tự động cho phỏng vấn online",
    "Lịch sử email theo từng ứng viên",
    "Báo cáo theo kênh tuyển + theo vị trí",
    "Tải CV từ TopCV / CareerViet (tự động)",
  ];
  let p2y = 2.9;
  for (const p of phase2) {
    slide.addText("→", {
      x: 7.0, y: p2y, w: 0.3, h: 0.32,
      fontFace: FONT, fontSize: 12, bold: true, color: PROGRESS,
    });
    slide.addText(p, {
      x: 7.3, y: p2y, w: 5.3, h: 0.4,
      fontFace: FONT, fontSize: 11, color: TEXT,
    });
    p2y += 0.5;
  }

  // Bottom callout
  slide.addShape("rect", {
    x: 0.6, y: 7.05, w: 12.1, h: 0.4,
    fill: { color: YELLOW }, line: { type: "none" },
  });
  slide.addText(
    "BOD muốn xem demo Pha 1 ngày nào? — Chủ động đặt lịch ngay sau buổi họp này.",
    {
      x: 0.6, y: 7.05, w: 12.1, h: 0.4,
      fontFace: FONT_TITLE, fontSize: 12, bold: true, color: NAVY,
      align: "center", valign: "middle",
    },
  );

  pageFooter(slide, next(), TOTAL_SLIDES); // 12
}

// ════════════ Slide 13 — Rủi ro & giảm thiểu ════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide);
  topAccent(slide);
  slideHeader(slide, "RỦI RO & GIẢM THIỂU", "Đã nhận diện trước — không bị bất ngờ");

  const risks = [
    {
      level: "TRUNG BÌNH",
      levelColor: WARN,
      title: "IT chậm cấu hình Microsoft 365",
      mitigation: "Pha 1 demo không cần IT — chứng minh giá trị trước. BOD đỡ thúc đẩy lịch IT.",
    },
    {
      level: "THẤP",
      levelColor: SUCCESS,
      title: "Chi phí Gemini API tăng nếu nhiều CV",
      mitigation: "Báo động tự động ở mức 5 USD/ngày, ngắt mạch ở 25 USD/ngày. Hiện tại ~0,003 USD/CV.",
    },
    {
      level: "THẤP",
      levelColor: SUCCESS,
      title: "AI chấm sai → ảnh hưởng quyết định tuyển",
      mitigation: "Mọi điểm AI đều có bằng chứng trích từ CV để HR đối chiếu. HR có thể chấm thủ công bất cứ lúc nào.",
    },
    {
      level: "THẤP",
      levelColor: SUCCESS,
      title: "Chị Hương khó thích nghi với hệ thống mới",
      mitigation: "Giao diện 100% tiếng Việt, đã được thiết kế dựa trên cách làm hiện tại. Có buổi đào tạo 2h trước khi vận hành chính thức.",
    },
    {
      level: "THẤP",
      levelColor: SUCCESS,
      title: "Mất dữ liệu / lỗi bảo mật",
      mitigation: "Supabase Pro có sao lưu Point-in-Time 7 ngày. RLS bật đầy đủ — mỗi vai trò chỉ thấy dữ liệu của mình.",
    },
  ];

  let y = 1.55;
  for (const r of risks) {
    const cardH = 0.9;
    card(slide, 0.6, y, 12.1, cardH, { accentColor: r.levelColor });
    statusPill(slide, 0.85, y + 0.2, 1.5, 0.5, r.level, r.levelColor);
    slide.addText(r.title, {
      x: 2.5, y: y + 0.15, w: 4.6, h: 0.6,
      fontFace: FONT_TITLE, fontSize: 13, bold: true, color: NAVY,
      valign: "middle",
    });
    // separator
    slide.addShape("rect", {
      x: 7.2, y: y + 0.15, w: 0.02, h: 0.6,
      fill: { color: BORDER }, line: { type: "none" },
    });
    slide.addText("Giảm thiểu:", {
      x: 7.4, y: y + 0.12, w: 1.2, h: 0.3,
      fontFace: FONT, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 2,
    });
    slide.addText(r.mitigation, {
      x: 7.4, y: y + 0.38, w: 5.1, h: 0.5,
      fontFace: FONT, fontSize: 10.5, color: TEXT,
    });
    y += cardH + 0.1;
  }

  pageFooter(slide, next(), TOTAL_SLIDES); // 13
}

// ════════════ Slide 14 — Cảm ơn / Q&A ═══════════════════════════
{
  const slide = pres.addSlide();
  paintBackground(slide, NAVY);

  // big yellow band lower-third
  slide.addShape("rect", {
    x: 0, y: SLIDE_H - 1.6, w: SLIDE_W, h: 0.04,
    fill: { color: YELLOW }, line: { type: "none" },
  });

  // Logo
  try {
    slide.addImage({
      path: LOGO_DARK,
      x: SLIDE_W / 2 - 1.2, y: 0.9, w: 2.4, h: 1.8,
      sizing: { type: "contain", w: 2.4, h: 1.8 },
    });
  } catch (_e) {}

  slide.addText("CẢM ƠN BAN GIÁM ĐỐC", {
    x: 0, y: 3.0, w: SLIDE_W, h: 0.7,
    fontFace: FONT_TITLE, fontSize: 38, bold: true, color: WHITE,
    align: "center", charSpacing: 6,
  });
  slide.addShape("rect", {
    x: SLIDE_W / 2 - 1, y: 3.75, w: 2, h: 0.06,
    fill: { color: YELLOW }, line: { type: "none" },
  });
  slide.addText("Câu hỏi & Thảo luận", {
    x: 0, y: 3.95, w: SLIDE_W, h: 0.5,
    fontFace: FONT, fontSize: 22, color: YELLOW_SOFT, italic: true, align: "center",
  });

  // Three CTAs
  const ctas = [
    { label: "Cam kết demo Pha 1", value: "Trong 2 tuần" },
    { label: "Nhờ BOD thúc đẩy IT", value: "Lịch triển khai tuần tới" },
    { label: "Phối hợp HR — chị Hương", value: "Điền phiếu thông tin trong tuần này" },
  ];
  const ctaW = 3.4;
  const ctaY = 5.0;
  const startX = SLIDE_W / 2 - (ctaW * 3 + 0.4) / 2;
  for (let i = 0; i < ctas.length; i++) {
    const x = startX + i * (ctaW + 0.2);
    const c = ctas[i];
    slide.addShape("roundRect", {
      x, y: ctaY, w: ctaW, h: 1.3,
      fill: { color: NAVY_SOFT },
      line: { color: YELLOW, width: 1.5 },
      rectRadius: 0.1,
    });
    slide.addText(c.label, {
      x: x + 0.2, y: ctaY + 0.2, w: ctaW - 0.4, h: 0.4,
      fontFace: FONT, fontSize: 11, color: YELLOW, bold: true, align: "center", charSpacing: 2,
    });
    slide.addText(c.value, {
      x: x + 0.2, y: ctaY + 0.65, w: ctaW - 0.4, h: 0.5,
      fontFace: FONT_TITLE, fontSize: 16, bold: true, color: WHITE, align: "center",
    });
  }

  // contact strip
  slide.addText("Sanh Võ  •  sanh.vlt@matkinh.com.vn  •  Phòng Dự án Sản phẩm — Mắt Việt", {
    x: 0, y: SLIDE_H - 0.7, w: SLIDE_W, h: 0.4,
    fontFace: FONT, fontSize: 11, color: YELLOW_SOFT, italic: true, align: "center",
  });
  slide.addText("Mắt Việt HR  •  Tháng 4/2026", {
    x: 0, y: SLIDE_H - 0.35, w: SLIDE_W, h: 0.3,
    fontFace: FONT, fontSize: 9, color: WHITE, align: "center",
  });

  next(); // 14
}

// ───────────────────────── Save ──────────────────────────────

const outPath = resolve(here, "..", "..", "docs", "presentations", "bod-update-2026-04.pptx");
mkdirSync(dirname(outPath), { recursive: true });
await pres.writeFile({ fileName: outPath });
console.log(`Wrote ${outPath}`);
