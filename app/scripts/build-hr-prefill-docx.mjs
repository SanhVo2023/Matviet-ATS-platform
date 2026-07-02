// Builds docs/onboarding/hr-prefill-form.vi.docx from a hand-coded structure.
// Run with: node scripts/build-hr-prefill-docx.mjs
// Requires: app/node_modules/docx (devDep in app/package.json)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageOrientation,
  ShadingType,
} from "docx";

// ---------- styling helpers ----------

const NAVY = "003D7A";
const GRAY = "6B7280";
const LIGHT_BG = "F3F4F6";
const ACCENT_BG = "EFF6FF";

const SUBTLE_BORDER = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
  left:   { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
  right:  { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
};

const FONT = "Calibri";

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, color: NAVY, font: FONT })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: NAVY, font: FONT })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: NAVY, font: FONT })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: FONT, ...opts })],
  });
}

/** Italic gray hint paragraph. */
function hint(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, italics: true, size: 20, color: GRAY, font: FONT })],
  });
}

/** Bullet list item. */
function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: FONT })],
  });
}

/** Empty placeholder box for free-text input. Renders as a single-cell table
 *  with light gray background — easy for HR to click into and start typing. */
function placeholderBox(promptText, lines = 5) {
  const empties = Array.from({ length: lines - 1 }, () =>
    new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: " ", size: 22, font: FONT })] }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: SUBTLE_BORDER,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: LIGHT_BG, color: "auto" },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: promptText,
                    italics: true,
                    color: GRAY,
                    size: 20,
                    font: FONT,
                  }),
                ],
              }),
              ...empties,
            ],
          }),
        ],
      }),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "" })] });
}

function divider() {
  return new Paragraph({
    border: {
      bottom: { color: "D1D5DB", space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: "" })],
  });
}

/** Header row + body rows. cellsRows is an array of arrays of strings.
 *  Header rendered with navy fill, white bold text. */
function buildTable(headers, rows, opts = {}) {
  const colWidths = opts.colWidths || headers.map(() => Math.floor(9000 / headers.length));
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
          new Paragraph({
            spacing: { after: 0 },
            children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: FONT })],
          }),
        ],
      }),
    ),
  });

  const bodyRows = rows.map((cells, rowIdx) =>
    new TableRow({
      children: cells.map((cell, i) => {
        const isPlaceholder = typeof cell === "string" && cell.startsWith("[") && cell.endsWith("]");
        return new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: rowIdx % 2 === 1
            ? { type: ShadingType.CLEAR, fill: LIGHT_BG, color: "auto" }
            : undefined,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: typeof cell === "string" ? cell : "",
                  italics: isPlaceholder,
                  color: isPlaceholder ? GRAY : "111827",
                  size: 20,
                  font: FONT,
                }),
              ],
            }),
          ],
        });
      }),
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: SUBTLE_BORDER,
    rows: [headerRow, ...bodyRows],
  });
}

/** Two-column field/value grid (used for "Trường thông tin / Nội dung" sections).
 *  Each item: [label, placeholderOrValue]. */
function buildFieldGrid(items) {
  return buildTable(["Trường thông tin", "Nội dung"], items, {
    colWidths: [3200, 5800],
  });
}

/** Cover banner at the top of the document. */
function coverBanner() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 12, color: NAVY },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
      left:   { style: BorderStyle.NONE, size: 0, color: "auto" },
      right:  { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: ACCENT_BG, color: "auto" },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "PHIẾU THÔNG TIN HR — MẮT VIỆT",
                    bold: true,
                    size: 32,
                    color: NAVY,
                    font: FONT,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: "Cài đặt phần mềm tuyển dụng nội bộ",
                    italics: true,
                    color: GRAY,
                    size: 22,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ---------- JD block (repeated 3 times) ----------

function jdBlock(idx) {
  return [
    h3(`JD vị trí ${idx}`),
    buildFieldGrid([
      ["Tên vị trí",                   "[VD: Tư vấn bán hàng — CN Quận 1]"],
      ["Phòng ban / Chi nhánh",        "[VD: CN Quận 1]"],
      ["Nhóm vị trí (role family)",    "[sales / optometry / clinical / management / office]"],
      ["Số lượng cần tuyển",           "[VD: 02]"],
      ["Mức lương đề xuất (gross)",    "[VD: 8.000.000 – 12.000.000 đ + thưởng]"],
      ["Hình thức làm việc",           "[Toàn thời gian / Bán thời gian / Thử việc]"],
      ["Địa điểm làm việc",            "[VD: 123 Lý Tự Trọng, P. Bến Nghé, Q.1]"],
      ["Ca làm việc",                  "[VD: 8h00 – 17h30, nghỉ Chủ nhật]"],
      ["Trưởng phòng phụ trách",       "[Tên — đã có ở Mục 2]"],
      ["Người phỏng vấn chuyên môn",   "[Tên — nếu khác Trưởng phòng]"],
      ["Mức độ ưu tiên",               "[Cao / Trung bình / Thấp]"],
      ["Hạn tuyển",                    "[VD: 30/06/2026]"],
    ]),
    spacer(),
    p("Mô tả công việc (JD chi tiết):", { bold: true }),
    placeholderBox("[Liệt kê đầu việc chính: tư vấn, đo mắt, chăm sóc khách, báo cáo doanh số…]", 6),
    spacer(),
    p("Yêu cầu BẮT BUỘC (must-have):", { bold: true }),
    placeholderBox("[VD: Tốt nghiệp THPT, giao tiếp tốt, sẵn sàng làm cuối tuần…]", 4),
    spacer(),
    p("Yêu cầu ƯU TIÊN (nice-to-have):", { bold: true }),
    placeholderBox("[VD: Đã làm cửa hàng kính, biết tiếng Anh giao tiếp…]", 4),
    spacer(),
    p("Quyền lợi:", { bold: true }),
    placeholderBox("[Lương + thưởng, BHXH/BHYT, đồng phục, đào tạo…]", 4),
    divider(),
  ];
}

// ---------- email block ----------

function emailBlock(num, title, hintText) {
  return [
    h3(`${num}. ${title}`),
    hintText ? hint(hintText) : null,
    p("Hiện đang dùng?  [ Có  /  Không ]", { bold: false }),
    p("Tiêu đề email:", { bold: true }),
    placeholderBox("[Gõ tiêu đề email mẫu hiện tại — nếu chưa có thì để trống]", 1),
    spacer(),
    p("Nội dung email:", { bold: true }),
    placeholderBox("[Paste nguyên văn email mẫu hiện đang dùng — phần mềm sẽ tự thay tên ứng viên/vị trí…]", 8),
    divider(),
  ].filter(Boolean);
}

// ---------- main composition ----------

const sections = [];

// Cover
sections.push(coverBanner());
sections.push(spacer());

sections.push(buildFieldGrid([
  ["Người điền",       "Chị Bùi Thị Hương — Phòng Nhân sự"],
  ["Mục đích",         "Cung cấp dữ liệu thực tế để cài đặt phần mềm Mắt Việt HR."],
  ["Cách điền",        "Mở Word, gõ trực tiếp vào ô [ … ] màu xám. Phần nào chưa có thì ghi “chưa có” hoặc bỏ trống."],
  ["Gửi lại cho",      "Sanh Võ — sanh.vlt@matkinh.com.vn (đính kèm file Word đã điền)"],
]));
sections.push(divider());

// 1. HR contact
sections.push(h1("1. Thông tin HR đầu mối"));
sections.push(buildFieldGrid([
  ["Họ tên đầy đủ",          "[VD: Bùi Thị Hương]"],
  ["Chức danh",              "[VD: Chuyên viên Nhân sự]"],
  ["Email công ty",          "[VD: huong.btb@matkinh.com.vn]"],
  ["Số điện thoại",          "[VD: 0901 234 567]"],
  ["Email cá nhân (dự phòng)", "[Nếu cần]"],
  ["Phòng ban",              "[VD: Phòng Hành chính – Nhân sự]"],
]));
sections.push(spacer());
sections.push(p("Chữ ký email mong muốn (gõ nguyên văn):", { bold: true }));
sections.push(placeholderBox("[VD:\nTrân trọng,\nBùi Thị Hương\nChuyên viên Nhân sự — Mắt Việt\nhuong.btb@matkinh.com.vn | 0901 234 567]", 5));
sections.push(divider());

// 2. Hiring managers
sections.push(h1("2. Danh bạ Trưởng phòng (Hiring Managers)"));
sections.push(hint("Trưởng phòng là người duyệt vòng “Đề xuất Trưởng phòng” và thường là người phỏng vấn chuyên môn. Liệt kê tất cả Trưởng phòng có thẩm quyền tuyển người."));
sections.push(buildTable(
  ["STT", "Họ tên", "Phòng ban / Chi nhánh", "Email", "SĐT", "Vị trí phụ trách tuyển"],
  [
    ["1", "[VD: Nguyễn Văn An]", "[VD: Bán hàng — CN Q.1]", "[an.nv@matkinh.com.vn]", "[0901…]", "[Tư vấn bán hàng, Cửa hàng trưởng]"],
    ["2", "", "", "", "", ""],
    ["3", "", "", "", "", ""],
    ["4", "", "", "", "", ""],
    ["5", "", "", "", "", ""],
    ["6", "", "", "", "", ""],
    ["7", "", "", "", "", ""],
    ["8", "", "", "", "", ""],
  ],
  { colWidths: [600, 1600, 1800, 1800, 1100, 2100] },
));
sections.push(divider());

// 3. Interviewers
sections.push(h1("3. Người phỏng vấn (nếu khác Trưởng phòng)"));
sections.push(hint("Một số vị trí có người phỏng vấn chuyên môn riêng (VD: BS. mắt phỏng vấn ứng viên Khúc xạ; Kế toán trưởng phỏng vấn ứng viên Kế toán). Nếu trùng với Mục 2 thì bỏ qua mục này."));
sections.push(buildTable(
  ["STT", "Họ tên", "Email", "Phòng ban", "Chuyên môn / Vị trí phỏng vấn"],
  [
    ["1", "[VD: BS. Trần Thị Bình]", "[binh.tt@matkinh.com.vn]", "[Phòng Khám]", "[Khúc xạ viên, BS. Mắt]"],
    ["2", "", "", "", ""],
    ["3", "", "", "", ""],
    ["4", "", "", "", ""],
    ["5", "", "", "", ""],
  ],
  { colWidths: [600, 2000, 2200, 1800, 2400] },
));
sections.push(divider());

// 4. BOD / Group approvers
sections.push(h1("4. Cấp phê duyệt BOD / Tập đoàn"));
sections.push(hint("Áp dụng cho vị trí cấp Quản lý (Cửa hàng trưởng, Trưởng phòng, Trưởng chi nhánh, Giám đốc…). Vị trí nhân viên thường chỉ qua HR + Trưởng phòng + chốt lương."));

sections.push(h2("4.1 Cấp BOD (Ban Giám đốc Mắt Việt)"));
sections.push(buildTable(
  ["Họ tên", "Chức danh", "Email"],
  [
    ["[VD: Ông Nguyễn Văn C]", "[Tổng Giám đốc Mắt Việt]", "[c.nv@matkinh.com.vn]"],
    ["", "", ""],
    ["", "", ""],
  ],
  { colWidths: [3000, 3000, 3000] },
));

sections.push(h2("4.2 Cấp Tập đoàn (nếu có)"));
sections.push(buildTable(
  ["Họ tên", "Chức danh", "Email"],
  [
    ["[VD: Bà Lê Thị D]", "[PCT Tập đoàn — phụ trách Nhân sự]", "[d.lt@…]"],
    ["", "", ""],
    ["", "", ""],
  ],
  { colWidths: [3000, 3000, 3000] },
));
sections.push(divider());

// 5. Job descriptions
sections.push(h1("5. JD (Mô tả công việc) các vị trí đang/sắp tuyển"));
sections.push(hint("Điền JD cho từng vị trí cần tuyển. Nếu đã có JD bằng Word/PDF rời thì có thể đính kèm thêm — không cần gõ lại."));
sections.push(p("Nhóm vị trí (role family) — chọn 1 trong 5:", { bold: true }));
sections.push(bullet("sales — Tư vấn bán hàng, Cửa hàng trưởng"));
sections.push(bullet("optometry — Khúc xạ viên, Kỹ thuật viên đo mắt"));
sections.push(bullet("clinical — Bác sĩ mắt, Điều dưỡng"));
sections.push(bullet("management — Trưởng phòng, Trưởng chi nhánh, Giám đốc"));
sections.push(bullet("office — Kế toán, HR, Marketing, Hành chính, IT"));
sections.push(spacer());

for (const idx of [1, 2, 3]) sections.push(...jdBlock(idx));

sections.push(hint("Cần thêm vị trí? Sao chép khối “JD vị trí 3” và dán phía dưới."));
sections.push(divider());

// 6. Email templates
sections.push(h1("6. Mẫu email đang dùng"));
sections.push(hint("Phần mềm sẽ gửi email tự động hoặc qua duyệt của HR. Nếu chị đã có mẫu đang dùng (Outlook/Gmail), paste vào đây để Sanh nạp vào hệ thống. Nếu chưa có sẵn, hệ thống đã có sẵn 6 mẫu chuẩn — ghi “Dùng mẫu mặc định”."));

sections.push(...emailBlock("6.1", "Email cảm ơn ứng tuyển (gửi ngay khi nhận CV)"));
sections.push(...emailBlock("6.2", "Email mời phỏng vấn"));
sections.push(...emailBlock("6.3", "Email từ chối SAU khi xem CV"));
sections.push(...emailBlock("6.4", "Email từ chối SAU phỏng vấn"));
sections.push(...emailBlock("6.5", "Email mời làm bài test (nếu có)", "Vị trí nào yêu cầu bài test? VD: Kế toán, Marketing — vị trí Tư vấn bán hàng có thể không cần."));
sections.push(...emailBlock("6.6", "Email gửi Offer (thư mời nhận việc)"));

// 7. Forms
sections.push(h1("7. Biểu mẫu / giấy tờ chuẩn của công ty"));
sections.push(hint("Liệt kê biểu mẫu HR đang dùng. Đính kèm file Word/PDF nếu có; không cần gõ lại nội dung. Nếu công ty chưa có mẫu chuẩn, ghi “Chưa có”."));
sections.push(buildTable(
  ["STT", "Tên biểu mẫu", "Đã có file?", "Khi nào dùng", "Ghi chú"],
  [
    ["1",  "Phiếu thông tin ứng viên",        "[Có / Chưa có]", "[Khi đến phỏng vấn]", ""],
    ["2",  "Hợp đồng thử việc",               "[Có / Chưa có]", "[Khi nhận việc]",     ""],
    ["3",  "Hợp đồng lao động chính thức",    "[Có / Chưa có]", "[Sau thử việc]",      ""],
    ["4",  "Phiếu khám sức khỏe",             "[Có / Chưa có]", "[Trước nhận việc]",   ""],
    ["5",  "Phiếu đánh giá phỏng vấn",        "[Có / Chưa có]", "[Sau phỏng vấn]",     ""],
    ["6",  "Bản cam kết bảo mật",             "[Có / Chưa có]", "",                    ""],
    ["7",  "Form đăng ký BHXH / BHYT",        "[Có / Chưa có]", "",                    ""],
    ["8",  "Sổ tay nhân viên",                "[Có / Chưa có]", "",                    ""],
    ["9",  "[Khác — ghi tên biểu mẫu]",       "",               "",                    ""],
    ["10", "[Khác — ghi tên biểu mẫu]",       "",               "",                    ""],
  ],
  { colWidths: [600, 2800, 1400, 2200, 2000] },
));
sections.push(p("Đính kèm tất cả các file đã có khi gửi email lại cho Sanh.", { italics: true, color: GRAY }));
sections.push(divider());

// 8. Meeting rooms
sections.push(h1("8. Phòng họp & địa điểm phỏng vấn"));
sections.push(hint("Dùng để gắn vào lịch Outlook khi đặt lịch phỏng vấn trực tiếp."));
sections.push(buildTable(
  ["Tên phòng / địa điểm", "Địa chỉ đầy đủ", "Sức chứa", "Có máy chiếu?", "Ghi chú"],
  [
    ["[VD: Phòng họp tầng 3 — Trụ sở]", "[123 Lý Tự Trọng, Q.1, TP.HCM]", "[10 người]", "[Có]", "[Đặt qua chị Hoa lễ tân]"],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ],
  { colWidths: [2400, 2800, 1200, 1300, 1300] },
));
sections.push(spacer());
sections.push(p("Phỏng vấn online:", { bold: true }));
sections.push(bullet("Hệ thống Mắt Việt sẽ tự tạo link Microsoft Teams cho mỗi buổi phỏng vấn online (sau khi IT cấu hình xong Microsoft Graph)."));
sections.push(bullet("Trong thời gian chờ IT, chị Hương vẫn dùng cách hiện tại (tự tạo link Teams/Zoom rồi paste vào lịch)."));
sections.push(divider());

// 9. Channels
sections.push(h1("9. Kênh đăng tin tuyển dụng"));
sections.push(hint("Liệt kê các trang chị đang đăng tin để tìm ứng viên. Thông tin tài khoản chỉ cần 1 lần."));
sections.push(buildTable(
  ["Kênh", "Đang dùng?", "Tài khoản (email login)", "Link trang công ty", "CV/tháng"],
  [
    ["TopCV",                       "[Có / Không]", "[ ]", "[ ]", "[ ]"],
    ["CareerViet (VietnamWorks cũ)", "[Có / Không]", "[ ]", "[ ]", "[ ]"],
    ["VietnamWorks",                "[Có / Không]", "[ ]", "[ ]", "[ ]"],
    ["Facebook Page Mắt Việt",      "[Có / Không]", "[ ]", "[ ]", "[ ]"],
    ["Group Facebook việc làm",     "[Có / Không]", "[ ]", "[ ]", "[ ]"],
    ["Website Mắt Việt",            "[Có / Không]", "[ ]", "[ ]", "[ ]"],
    ["Giới thiệu nội bộ",           "[Có / Không]", "—",    "—",    "[ ]"],
    ["Đăng tin tại cửa hàng",       "[Có / Không]", "—",    "—",    "[ ]"],
    ["[Khác]",                      "",             "",     "",     ""],
  ],
  { colWidths: [2200, 1400, 2000, 2200, 1200] },
));
sections.push(divider());

// 10. Branding
sections.push(h1("10. Logo, màu thương hiệu, chữ ký email"));
sections.push(buildFieldGrid([
  ["File logo công ty (PNG/SVG, nền trong suốt)", "[Đính kèm khi gửi lại]"],
  ["Màu chủ đạo (mã hex)",                        "[VD: #003D7A — xanh dương Mắt Việt]"],
  ["Màu phụ",                                     "[VD: #F5A623]"],
  ["Font chữ ưu tiên",                            "[VD: Inter / Roboto / Times New Roman]"],
  ["Slogan công ty",                              "[VD: “Đôi mắt sáng — cuộc sống tươi”]"],
  ["Website chính thức",                          "[VD: https://matkinh.com.vn]"],
  ["Hotline",                                     "[VD: 1900 …]"],
]));
sections.push(spacer());
sections.push(p("Chữ ký email mặc định cho HR (gắn cuối mỗi email tự động):", { bold: true }));
sections.push(placeholderBox("[VD:\n─────────────────────────\nPhòng Nhân sự — Mắt Việt\nBùi Thị Hương | 0901 234 567\nhr@matkinh.com.vn\n123 Lý Tự Trọng, Q.1, TP.HCM\nwww.matkinh.com.vn]", 7));
sections.push(divider());

// 11. Current workflow
sections.push(h1("11. Quy trình tuyển dụng hiện tại"));
sections.push(hint("Mô tả tự do bằng lời. Mục đích: giúp Sanh thiết kế phần mềm sao cho gần với cách làm thực tế nhất."));

sections.push(h3("11.1 Khi nhận CV (từ TopCV / email / Facebook):"));
sections.push(placeholderBox("[Mô tả các bước hiện chị đang làm khi có CV mới về…]", 4));
sections.push(spacer());

sections.push(h3("11.2 Khi mời ứng viên đi phỏng vấn:"));
sections.push(placeholderBox("[Gọi điện trước? Gửi email? Ai duyệt lịch trước khi gửi?…]", 4));
sections.push(spacer());

sections.push(h3("11.3 Sau buổi phỏng vấn:"));
sections.push(placeholderBox("[Ghi nhận kết quả ở đâu? Ai quyết định đậu/rớt?…]", 4));
sections.push(spacer());

sections.push(h3("11.4 Khi quyết định tuyển:"));
sections.push(placeholderBox("[Gửi offer như thế nào? Ký hợp đồng ở đâu?…]", 4));
sections.push(spacer());

sections.push(h3("11.5 Khi từ chối ứng viên:"));
sections.push(placeholderBox("[Gửi email từ chối? Có gọi điện báo không?…]", 4));
sections.push(spacer());

sections.push(h3("11.6 Phần khó khăn / mất nhiều thời gian nhất hiện tại:"));
sections.push(placeholderBox("[VD: “Phải gọi 5–6 lần ứng viên mới bốc máy”, “Trưởng phòng chậm phản hồi CV”, “Khó theo dõi ai đang ở vòng nào”…]", 4));
sections.push(spacer());

sections.push(h3("11.7 Mong muốn cải thiện sau khi có phần mềm:"));
sections.push(placeholderBox("[Mong phần mềm giúp chị nhất ở việc gì?]", 4));
sections.push(divider());

// 12. Open questions
sections.push(h1("12. Câu hỏi mở (không bắt buộc)"));

sections.push(h3("12.1 Vị trí nào hiện đang khó tuyển nhất? Tại sao?"));
sections.push(placeholderBox("[ ]", 3));
sections.push(spacer());

sections.push(h3("12.2 Tiêu chí cá nhân của chị khi sàng lọc CV (kinh nghiệm “đọc người”):"));
sections.push(placeholderBox("[VD: “Em loại CV không có ảnh”, “Ưu tiên người ở gần cửa hàng”, “Tránh người nhảy việc 3 chỗ trong 1 năm”…]", 4));
sections.push(spacer());

sections.push(h3("12.3 Phần nào của công việc chị muốn AI giúp nhất?"));
sections.push(placeholderBox("[VD: “Chấm CV tự động”, “Tự gửi email mời”, “Nhắc lịch phỏng vấn”…]", 3));
sections.push(divider());

// Closing
sections.push(h1("✓ Hoàn tất"));
sections.push(p("Sau khi điền xong:"));
sections.push(bullet("Lưu file với tên: Phiếu thông tin HR — đã điền — [tên chị].docx"));
sections.push(bullet("Đính kèm các file liên quan (logo, biểu mẫu, JD rời, mẫu email…)"));
sections.push(bullet("Gửi email cho: sanh.vlt@matkinh.com.vn"));
sections.push(bullet("Tiêu đề email: Phiếu thông tin HR — Mắt Việt — đã điền"));
sections.push(spacer());
sections.push(p("Cảm ơn chị Hương rất nhiều!", { bold: true, color: NAVY }));
sections.push(p("Phần thông tin chị cung cấp sẽ giúp phần mềm chạy đúng với cách làm thực tế tại Mắt Việt — không phải làm theo lý thuyết suông."));
sections.push(p("Nếu có chỗ nào không hiểu, gọi/nhắn Sanh — không cần điền cho hết một mạch."));

// ---------- assemble & write ----------

const doc = new Document({
  creator: "Mắt Việt HR — build script",
  title: "Phiếu thông tin HR — Mắt Việt",
  description: "Form to capture HR prefill data for the Mắt Việt HR app",
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 22 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 },
        },
      },
      children: sections,
    },
  ],
});

const here = dirname(fileURLToPath(import.meta.url));
// scripts/ → app/ → project root → docs/onboarding/...
const outPath = resolve(here, "..", "..", "docs", "onboarding", "hr-prefill-form.vi.docx");

mkdirSync(dirname(outPath), { recursive: true });
const buffer = await Packer.toBuffer(doc);
writeFileSync(outPath, buffer);

console.log(`Wrote ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
