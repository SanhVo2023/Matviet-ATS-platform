// Generates 10 styled Vietnamese test CVs (PDF) for the job
// "Nhân viên bán hàng — Vincom Đồng Khởi" with a graded match ladder,
// plus manifest.json capturing the EXPECTED ranking for AI-scorer evaluation.
//
// Run: node scripts/generate-test-cvs.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfmake = require("pdfmake"); // v0.3 Node API: setFonts + createPdf
const FONT_DIR = join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto");
pdfmake.setFonts({
  Roboto: {
    normal: join(FONT_DIR, "Roboto-Regular.ttf"),
    bold: join(FONT_DIR, "Roboto-Medium.ttf"),
    italics: join(FONT_DIR, "Roboto-Italic.ttf"),
    bolditalics: join(FONT_DIR, "Roboto-MediumItalic.ttf"),
  },
});

const NAVY = "#0b1430";
const GOLD = "#c38d02";

const outDir = process.argv[2] || "test-cvs";
mkdirSync(outDir, { recursive: true });

/** ---------- CV content (graded match ladder) ---------- */
const CVS = [
  {
    file: "cv-01-kimngan.pdf",
    name: "Trần Thị Kim Ngân",
    email: "kimngan.test@example.com",
    phone: "+84912000001",
    expected_rank: 1,
    expected_band: "85-95",
    rationale: "Perfect match: 4 năm bán kính mắt cao cấp, chứng chỉ khúc xạ, tiếng Anh, sống Q.1",
    style: "two-column, gold sidebar",
    profile: {
      dob: "12/03/1996", address: "Quận 1, TP.HCM",
      objective: "Chuyên viên tư vấn kính mắt cao cấp với 4 năm kinh nghiệm, mong muốn phát triển tại môi trường bán lẻ sang trọng.",
      exp: [
        ["2022 – nay", "Chuyên viên tư vấn cao cấp — Kính mắt LensLux (TTTM Takashimaya, Q.1)", "Tư vấn gọng hàng hiệu (Gucci, Rayban, Lindberg); đo khúc xạ và tư vấn tròng đa tròng; đạt 125% chỉ tiêu doanh số năm 2025; chăm sóc nhóm khách VIP 200+ người."],
        ["2020 – 2022", "Nhân viên bán hàng — Mắt kính Sài Gòn Optic (Q.3)", "Bán lẻ kính thuốc và kính mát; hỗ trợ đo mắt; xử lý bảo hành, mài lắp tròng cơ bản."],
      ],
      edu: [["2018", "Cử nhân Quản trị kinh doanh — ĐH Kinh tế TP.HCM"], ["2021", "Chứng chỉ Đo khúc xạ trung cấp — BV Mắt TP.HCM"]],
      skills: ["Tư vấn khách hàng cao cấp", "Đo khúc xạ, chọn tròng", "Tiếng Anh giao tiếp tốt (TOEIC 750)", "POS, quản lý tồn kho"],
    },
  },
  {
    file: "cv-02-hoangphuc.pdf",
    name: "Lê Hoàng Phúc",
    email: "hoangphuc.test@example.com",
    phone: "+84912000002",
    expected_rank: 2,
    expected_band: "72-85",
    rationale: "Strong: 3 năm bán mỹ phẩm ngay Vincom Đồng Khởi, KPI tốt, quen môi trường TTTM — thiếu kiến thức quang học",
    style: "banner header màu navy",
    profile: {
      dob: "25/07/1998", address: "Quận 3, TP.HCM",
      objective: "Nhân viên bán hàng TTTM với thành tích KPI ổn định, muốn chuyển sang ngành kính mắt.",
      exp: [
        ["2023 – nay", "Beauty Advisor — Shiseido (Vincom Center Đồng Khởi, Q.1)", "Tư vấn và bán mỹ phẩm cao cấp; đạt 118% KPI trung bình 2024–2025; top 3 doanh số khu vực Q4/2025; quen tệp khách TTTM trung tâm."],
        ["2021 – 2023", "Nhân viên bán hàng — The Body Shop (Vincom Landmark 81)", "Bán lẻ, trưng bày, kiểm kho; CSKH sau bán."],
      ],
      edu: [["2020", "Cao đẳng Thương mại TP.HCM"]],
      skills: ["Bán hàng tư vấn (consultative selling)", "CSKH cao cấp", "Tiếng Anh giao tiếp cơ bản", "Làm việc ca linh hoạt"],
    },
  },
  {
    file: "cv-03-thutrang.pdf",
    name: "Phạm Thu Trang",
    email: "thutrang.test@example.com",
    phone: "+84912000003",
    expected_rank: 3,
    expected_band: "62-74",
    rationale: "Khá: 2 năm bán lẻ thời trang chuỗi lớn, kỹ năng chuẩn — chưa từng làm TTTM trung tâm/kính mắt",
    style: "timeline 2 cột ngày–nội dung",
    profile: {
      dob: "02/11/1999", address: "Q. Bình Thạnh, TP.HCM",
      objective: "Nhân viên bán lẻ 2 năm kinh nghiệm chuỗi thời trang, học nhanh, muốn nâng cấp lên ngành hàng có tư vấn chuyên sâu.",
      exp: [
        ["2024 – nay", "Nhân viên bán hàng — UNIQLO Đồng Khởi", "Phục vụ sàn, fitting, thanh toán; được khen thưởng dịch vụ khách hàng Q2/2025."],
        ["2023 – 2024", "Nhân viên part-time — Routine (Q.1)", "Bán hàng, gấp xếp, kiểm kê."],
      ],
      edu: [["2021", "Tốt nghiệp THPT; đang học từ xa ngành QTKD — ĐH Mở TP.HCM"]],
      skills: ["Dịch vụ khách hàng chuỗi lớn", "Đứng quầy thu ngân", "Tiếng Anh cơ bản", "Chăm chỉ, đi ca cuối tuần"],
    },
  },
  {
    file: "cv-04-vankhoi.pdf",
    name: "Nguyễn Văn Khôi",
    email: "vankhoi.test@example.com",
    phone: "+84912000004",
    expected_rank: 4,
    expected_band: "52-64",
    rationale: "Trung bình: 1.5 năm F&B đối diện khách, chưa bán lẻ sản phẩm; địa điểm Q.1 thuận lợi",
    style: "tối giản ATS một cột",
    profile: {
      dob: "19/01/2001", address: "Quận 1, TP.HCM",
      objective: "Barista chuyển hướng sang bán lẻ; mạnh về giao tiếp và xử lý khách đông.",
      exp: [
        ["2024 – nay", "Barista — Highlands Coffee (Nguyễn Huệ, Q.1)", "Phục vụ 300+ khách/ngày; xử lý khiếu nại; đào tạo 2 nhân viên mới."],
        ["2023 – 2024", "Phục vụ — Nhà hàng Món Huế (Q.1)", "Order, phục vụ bàn, thu ngân phụ."],
      ],
      edu: [["2019", "Tốt nghiệp THPT Bùi Thị Xuân"]],
      skills: ["Giao tiếp với mật độ khách cao", "Chịu áp lực, đứng ca dài", "Thu ngân cơ bản"],
    },
  },
  {
    file: "cv-05-mylinh.pdf",
    name: "Đỗ Mỹ Linh",
    email: "mylinh.test@example.com",
    phone: "+84912000005",
    expected_rank: 5,
    expected_band: "45-60",
    rationale: "Fresh graduate marketing + 3 tháng thực tập bán lẻ; tiềm năng nhưng thiếu số năm",
    style: "hiện đại thoáng, heading in hoa cách chữ",
    profile: {
      dob: "30/05/2003", address: "Quận 7, TP.HCM",
      objective: "Sinh viên mới tốt nghiệp Marketing, đam mê ngành bán lẻ thời trang – phụ kiện, mong muốn vị trí bán hàng để bắt đầu sự nghiệp.",
      exp: [
        ["06–09/2025", "Thực tập sinh bán lẻ — MINISO (Crescent Mall, Q.7)", "Hỗ trợ sàn, trưng bày khuyến mãi, khảo sát trải nghiệm khách."],
        ["2024", "CTV sự kiện — CLB Marketing UEH", "Điều phối gian hàng hội chợ 2 mùa."],
      ],
      edu: [["2025", "Cử nhân Marketing — ĐH Kinh tế TP.HCM (GPA 3.4/4)"]],
      skills: ["Canva, chụp ảnh sản phẩm", "Tiếng Anh khá (IELTS 6.0)", "Nhiệt tình, học nhanh"],
    },
  },
  {
    file: "cv-06-thanhtung.pdf",
    name: "Võ Thanh Tùng",
    email: "thanhtung.test@example.com",
    phone: "+84912000006",
    expected_rank: 6,
    expected_band: "38-52",
    rationale: "Trái ngành: 3 năm hành chính văn phòng, muốn chuyển sang bán hàng, chưa có bằng chứng kỹ năng bán",
    style: "cổ điển có đường kẻ, chữ serif cảm",
    profile: {
      dob: "08/09/1995", address: "Quận 5, TP.HCM",
      objective: "Nhân viên hành chính muốn chuyển hướng sang bán lẻ vì yêu thích giao tiếp với khách hàng.",
      exp: [
        ["2022 – nay", "Nhân viên hành chính — Công ty TNHH Vận tải Hoà Bình", "Quản lý hồ sơ, lễ tân văn phòng, hỗ trợ tổ chức sự kiện nội bộ."],
        ["2020 – 2022", "Trợ lý văn phòng — Công ty CP XNK Đại Nam", "Soạn thảo văn bản, trực điện thoại, đón khách."],
      ],
      edu: [["2017", "Cao đẳng Văn thư lưu trữ"]],
      skills: ["Word/Excel thành thạo", "Giao tiếp lịch sự", "Tính kỷ luật cao"],
    },
  },
  {
    file: "cv-07-ducthinh.pdf",
    name: "Hoàng Đức Thịnh",
    email: "ducthinh.test@example.com",
    phone: "+84912000007",
    expected_rank: 8,
    expected_band: "25-40",
    rationale: "Mismatch nghề nghiêm trọng: senior software engineer 6 năm — kỹ năng không liên quan bán lẻ",
    style: "kiểu kỹ thuật, mono-cảm, đậm đặc",
    profile: {
      dob: "14/02/1994", address: "TP. Thủ Đức, TP.HCM",
      objective: "Kỹ sư phần mềm tìm cơ hội trải nghiệm ngành bán lẻ trong thời gian nghỉ giữa hai dự án.",
      exp: [
        ["2022 – 2026", "Senior Backend Engineer — VNG Corporation", "Thiết kế microservices (Go, Kafka); dẫn dắt nhóm 4 kỹ sư."],
        ["2019 – 2022", "Software Engineer — FPT Software", "Phát triển hệ thống ERP cho khách Nhật."],
      ],
      edu: [["2017", "Kỹ sư CNTT — ĐH Bách Khoa TP.HCM"]],
      skills: ["Go, Python, Kubernetes", "Tiếng Anh + tiếng Nhật N3", "Không có kinh nghiệm bán hàng"],
    },
  },
  {
    file: "cv-08-thuha.pdf",
    name: "Ngô Thu Hà",
    email: "thuha.test@example.com",
    phone: "+84912000008",
    expected_rank: 7,
    expected_band: "55-70",
    rationale: "Bán hàng giỏi (5 năm, có quản lý ca) NHƯNG đang ở Hà Nội, không ghi sẵn sàng chuyển vào — tiêu chí địa điểm phải kéo xuống",
    style: "hai cột hiện đại xanh navy",
    profile: {
      dob: "21/12/1993", address: "Q. Cầu Giấy, Hà Nội",
      objective: "Trưởng ca bán lẻ với 5 năm kinh nghiệm ngành phụ kiện thời trang tại Hà Nội.",
      exp: [
        ["2023 – nay", "Trưởng ca — PNJ (Vincom Bà Triệu, Hà Nội)", "Điều phối ca 6 nhân viên; doanh số quầy đạt 110% mục tiêu 2025."],
        ["2019 – 2023", "Nhân viên bán hàng — Aristino (Hà Nội)", "Bán lẻ thời trang nam, chăm sóc khách thân thiết."],
      ],
      edu: [["2015", "Cử nhân Thương mại — ĐH Thương Mại"]],
      skills: ["Quản lý ca, kèm cặp nhân viên", "Bán hàng tư vấn", "Tiếng Anh giao tiếp"],
    },
  },
  {
    file: "cv-09-vansau.pdf",
    name: "Bùi Văn Sáu",
    email: "vansau.test@example.com",
    phone: "+84912000009",
    expected_rank: 9,
    expected_band: "18-32",
    rationale: "Yếu toàn diện: 4 năm công nhân xưởng, không kinh nghiệm khách hàng, ở Long An xa trung tâm",
    style: "đơn sơ, ít định dạng",
    profile: {
      dob: "05/06/1997", address: "Bến Lức, Long An",
      objective: "Tìm việc ổn định tại TP.HCM.",
      exp: [
        ["2021 – nay", "Công nhân vận hành máy — KCN Thuận Đạo (Long An)", "Đứng máy ép nhựa, kiểm phẩm, đóng gói theo ca."],
        ["2019 – 2021", "Phụ kho — Nhà máy gạch Đồng Tâm", "Bốc xếp, kiểm đếm hàng."],
      ],
      edu: [["2015", "Tốt nghiệp THCS"]],
      skills: ["Chịu khó, sức khoẻ tốt", "Làm ca đêm được"],
    },
  },
  {
    file: "cv-10-kimchi.pdf",
    name: "Lý Kim Chi",
    email: "kimchi.test@example.com",
    phone: "+84912000010",
    expected_rank: 10,
    expected_band: "30-50 (điểm phải bị kéo xuống vì thiếu bằng chứng)",
    rationale: "BẪY kiểm tra evidence: tự nhận 'chuyên gia bán hàng số 1' nhưng KHÔNG công ty, KHÔNG thời gian, KHÔNG số liệu — điểm cao chỉ khi AI bị lừa",
    style: "khoa trương, nhiều màu, chữ to",
    profile: {
      dob: "01/01/1999", address: "TP.HCM",
      objective: "CHUYÊN GIA BÁN HÀNG HÀNG ĐẦU! Bán hàng là đam mê, doanh số là hơi thở!",
      exp: [
        ["", "Chuyên gia bán hàng xuất sắc", "Kinh nghiệm bán hàng đỉnh cao nhiều năm. Doanh số luôn cao nhất. Khách hàng cực kỳ yêu quý. Kỹ năng bán hàng thượng thừa, chốt đơn thần tốc, dịch vụ 5 sao."],
        ["", "Nhà vô địch doanh số", "Từng đạt rất nhiều giải thưởng bán hàng danh giá. Được mọi công ty săn đón."],
      ],
      edu: [["", "Tự học thành tài qua thực chiến"]],
      skills: ["Bán hàng", "Bán hàng xuất sắc", "Siêu bán hàng", "Chốt sale thần tốc", "Tư vấn đỉnh cao"],
    },
  },
];

/** ---------- style builders (10 distinct looks) ---------- */
function sectionTitle(text, color = NAVY) {
  return { text: text.toUpperCase(), color, bold: true, fontSize: 11, margin: [0, 10, 0, 4] };
}
function expBlock(p, opts = {}) {
  return p.exp.map(([time, role, desc]) => ({
    margin: [0, 2, 0, 6],
    stack: [
      { text: role, bold: true, fontSize: 10.5, color: opts.roleColor || "#111" },
      time ? { text: time, fontSize: 9, color: "#666", margin: [0, 1, 0, 1] } : {},
      { text: desc, fontSize: 9.5, color: "#333" },
    ],
  }));
}
function baseBody(p) {
  return [
    sectionTitle("Mục tiêu nghề nghiệp"),
    { text: p.objective, fontSize: 9.5 },
    sectionTitle("Kinh nghiệm làm việc"),
    ...expBlock(p),
    sectionTitle("Học vấn"),
    ...p.edu.map(([y, e]) => ({ text: `${y ? y + " — " : ""}${e}`, fontSize: 9.5, margin: [0, 1, 0, 1] })),
    sectionTitle("Kỹ năng"),
    { ul: p.skills, fontSize: 9.5 },
  ];
}
function header(cv, color = NAVY, sub = true) {
  return [
    { text: cv.name, fontSize: 20, bold: true, color },
    sub
      ? { text: `${cv.phone}  ·  ${cv.email}  ·  ${cv.profile.address}  ·  Sinh: ${cv.profile.dob}`, fontSize: 9, color: "#555", margin: [0, 3, 0, 8] }
      : {},
  ];
}

const STYLES = [
  // 1 — two-column gold sidebar (navy rect drawn via absolute canvas)
  (cv) => ({
    pageMargins: [24, 30, 24, 30],
    content: [
      { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 842, color: NAVY }], absolutePosition: { x: 0, y: 0 } },
      {
        columns: [
          { width: 150, stack: [
            { text: cv.name, fontSize: 16, bold: true, color: "white", margin: [0, 0, 6, 4] },
            { text: "ỨNG VIÊN BÁN LẺ CAO CẤP", fontSize: 7, color: "#fcd54d", margin: [0, 0, 6, 14] },
            { text: "LIÊN HỆ", color: "#fcd54d", bold: true, fontSize: 9, margin: [0, 8, 6, 3] },
            { text: `${cv.phone}\n${cv.email}\n${cv.profile.address}\nSinh: ${cv.profile.dob}`, color: "#dde5f6", fontSize: 8.5, margin: [0, 0, 6, 10] },
            { text: "KỸ NĂNG", color: "#fcd54d", bold: true, fontSize: 9, margin: [0, 8, 6, 3] },
            ...cv.profile.skills.map((s) => ({ text: "•  " + s, color: "#dde5f6", fontSize: 8.5, margin: [0, 1, 6, 1] })),
          ]},
          { width: "*", margin: [22, 0, 0, 0], stack: [
            sectionTitle("Mục tiêu nghề nghiệp", GOLD), { text: cv.profile.objective, fontSize: 9.5 },
            sectionTitle("Kinh nghiệm", GOLD), ...expBlock(cv.profile),
            sectionTitle("Học vấn", GOLD), ...cv.profile.edu.map(([y, e]) => ({ text: `${y} — ${e}`, fontSize: 9.5 })),
          ]},
        ],
        columnGap: 0,
      },
    ],
  }),
  // 2 — banner header (navy band via absolute canvas)
  (cv) => ({
    pageMargins: [40, 104, 40, 40],
    content: [
      { canvas: [{ type: "rect", x: 0, y: 0, w: 595, h: 84, color: NAVY }], absolutePosition: { x: 0, y: 0 } },
      { text: cv.name, fontSize: 22, bold: true, color: "white", absolutePosition: { x: 40, y: 24 } },
      { text: `${cv.phone} · ${cv.email} · ${cv.profile.address}`, fontSize: 9, color: "#dde5f6", absolutePosition: { x: 40, y: 56 } },
      ...baseBody(cv.profile),
    ],
  }),
  // 3 — timeline
  (cv) => ({
    pageMargins: [44, 44, 44, 44],
    content: [
      ...header(cv),
      sectionTitle("Mục tiêu"), { text: cv.profile.objective, fontSize: 9.5 },
      sectionTitle("Quá trình làm việc"),
      { table: { widths: [90, "*"], body: cv.profile.exp.map(([t, r, d]) => [
        { text: t, fontSize: 9, bold: true, color: NAVY },
        { stack: [{ text: r, bold: true, fontSize: 10 }, { text: d, fontSize: 9.5, color: "#333" }], margin: [0, 0, 0, 6] },
      ]) }, layout: { hLineWidth: () => 0, vLineWidth: (i) => (i === 1 ? 1 : 0), vLineColor: () => "#ccd3e4", paddingLeft: (i) => (i === 1 ? 10 : 0) } },
      sectionTitle("Học vấn"), ...cv.profile.edu.map(([y, e]) => ({ text: `${y} — ${e}`, fontSize: 9.5 })),
      sectionTitle("Kỹ năng"), { ul: cv.profile.skills, fontSize: 9.5 },
    ],
  }),
  // 4 — minimal ATS
  (cv) => ({ pageMargins: [50, 50, 50, 50], content: [...header(cv, "#111"), ...baseBody(cv.profile).map((b) => ({ ...b, color: undefined }))] }),
  // 5 — airy modern caps
  (cv) => ({
    pageMargins: [56, 56, 56, 56], defaultStyle: { lineHeight: 1.25 },
    content: [
      { text: cv.name.toUpperCase(), fontSize: 24, bold: true, characterSpacing: 2, color: NAVY },
      { text: `${cv.phone}   |   ${cv.email}   |   ${cv.profile.address}`, fontSize: 8.5, color: "#667192", margin: [0, 6, 0, 14] },
      ...baseBody(cv.profile),
    ],
  }),
  // 6 — classic ruled
  (cv) => ({
    pageMargins: [48, 44, 48, 44],
    content: [
      ...header(cv),
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1.2, lineColor: NAVY }], margin: [0, 2, 0, 6] },
      ...baseBody(cv.profile),
    ],
  }),
  // 7 — dense technical
  (cv) => ({ pageMargins: [36, 36, 36, 36], defaultStyle: { fontSize: 8.5 }, content: [
    { text: cv.name, fontSize: 15, bold: true },
    { text: `${cv.phone} | ${cv.email} | ${cv.profile.address} | ${cv.profile.dob}`, fontSize: 8, color: "#444", margin: [0, 2, 0, 6] },
    ...baseBody(cv.profile),
  ]}),
  // 8 — navy two-col right rail
  (cv) => ({
    pageMargins: [40, 40, 40, 40],
    content: [{
      columns: [
        { width: "*", stack: [...header(cv), ...baseBody(cv.profile)] },
        { width: 140, stack: [
          { text: "THÔNG TIN", bold: true, fontSize: 9, color: NAVY, margin: [0, 6, 0, 3] },
          { text: `Sinh: ${cv.profile.dob}\n${cv.profile.address}`, fontSize: 8.5, color: "#555" },
          { text: "KỸ NĂNG NỔI BẬT", bold: true, fontSize: 9, color: NAVY, margin: [0, 12, 0, 3] },
          ...cv.profile.skills.slice(0, 4).map((s) => ({ text: "▪ " + s, fontSize: 8.5, margin: [0, 1, 0, 1] })),
        ], margin: [14, 8, 0, 0] },
      ],
    }],
  }),
  // 9 — plain sparse
  (cv) => ({ pageMargins: [60, 60, 60, 60], defaultStyle: { fontSize: 10 }, content: [
    { text: cv.name, fontSize: 16, bold: true },
    { text: `${cv.phone} - ${cv.email} - ${cv.profile.address}`, fontSize: 9, margin: [0, 2, 0, 10] },
    { text: "Mục tiêu: " + cv.profile.objective, margin: [0, 0, 0, 8] },
    { text: "Kinh nghiệm:", bold: true },
    ...cv.profile.exp.map(([t, r, d]) => ({ text: `${t ? t + ": " : ""}${r}. ${d}`, margin: [0, 2, 0, 4] })),
    { text: "Học vấn:", bold: true, margin: [0, 6, 0, 0] },
    ...cv.profile.edu.map(([y, e]) => ({ text: `${y ? y + " - " : ""}${e}` })),
    { text: "Kỹ năng: " + cv.profile.skills.join("; "), margin: [0, 8, 0, 0] },
  ]}),
  // 10 — flashy centered buzzword
  (cv) => ({
    pageMargins: [48, 40, 48, 40],
    content: [
      { text: "★ " + cv.name.toUpperCase() + " ★", alignment: "center", fontSize: 22, bold: true, color: "#c0392b" },
      { text: "SIÊU SAO BÁN HÀNG", alignment: "center", fontSize: 12, bold: true, color: GOLD, margin: [0, 4, 0, 2] },
      { text: `${cv.phone} · ${cv.email} · ${cv.profile.address}`, alignment: "center", fontSize: 9, margin: [0, 0, 0, 12] },
      { text: cv.profile.objective, alignment: "center", italics: true, fontSize: 11, color: "#c0392b", margin: [0, 0, 0, 10] },
      sectionTitle("Thành tích vang dội", "#c0392b"), ...expBlock(cv.profile, { roleColor: "#c0392b" }),
      sectionTitle("Học vấn", "#c0392b"), ...cv.profile.edu.map(([y, e]) => ({ text: e, fontSize: 9.5 })),
      sectionTitle("Kỹ năng vượt trội", "#c0392b"), { ul: cv.profile.skills, fontSize: 10, bold: true },
    ],
  }),
];

/** ---------- generate (awaited so Node doesn't exit early) ---------- */
async function render(def) {
  const pdf = pdfmake.createPdf(def);
  const buf = await pdf.getBuffer();
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

for (let i = 0; i < CVS.length; i++) {
  const cv = CVS[i];
  const def = STYLES[i](cv);
  def.defaultStyle = { font: "Roboto", ...(def.defaultStyle || {}) };
  const buf = await render(def);
  writeFileSync(join(outDir, cv.file), buf);
  console.log(`✓ ${cv.file} (${buf.length} bytes) — expected rank ${cv.expected_rank} [${cv.expected_band}]`);
}

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(
    CVS.map(({ profile, ...m }) => ({ ...m, address: profile.address })),
    null,
    2,
  ),
);
console.log(`\nManifest + ${CVS.length} CVs written to ${outDir}`);
