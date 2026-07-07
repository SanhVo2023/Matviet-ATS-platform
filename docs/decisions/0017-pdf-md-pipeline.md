# ADR 0017 — PDF là cửa vào duy nhất; CV→Markdown cache; dossier là VIEW

- **Status:** Accepted (Sanh directive + design debate, 2026-07-07)
- **Context:** Sanh muốn: (1) PDF upload là cách duy nhất và RÕ RÀNG NHẤT để
  bắt đầu quy trình; (2) mọi PDF convert sang Markdown một lần, mọi lần AI
  đụng tới ứng viên thì dùng MD chứ không dùng PDF; (3) bỏ CSV; (4) upload
  nhiều PDF; (5) "MD của ứng viên lớn dần theo quy trình" (note HR, phỏng
  vấn, deal lương) cho AI agent rút thông tin dễ dàng.

## Decisions

### 1. CV→MD cache — chính thức hóa cái đã chạy ngầm

`candidates.cv_text` đã là MD (toMarkdown) nhưng chỉ sinh khi chấm điểm chạy,
và prefill convert TRÙNG lần hai. Chính thức hóa bằng bảng **`cv_markdowns`**
(khóa `cv_file_id`, status pending/done/failed, engine, error — migration
0004): 

- `getOrCreateCvMarkdown()` (extract-text.ts) là **đường đọc CV duy nhất
  cho AI** — cache-first, ghi-xuyên.
- Prefill lúc upload trả `cv_md` về dialog → submit seed cache → **một file
  không bao giờ convert hai lần**.
- Worker chấm điểm đọc cache-first; queue convert = piggyback queue chấm
  điểm sẵn có (upload nào cũng auto-enqueue) — KHÔNG cần queue mới.
- Đổi CV → xóa rows cache theo candidate + re-enqueue (rows cũng cascade
  theo file). `cv_text` giữ làm alias đọc trong chuyển tiếp.

### 2. Dossier ứng viên = VIEW, không phải STORE (điểm grill chính)

Ghi bồi note/đánh giá/lương vào một file MD sẽ tạo nguồn sự thật thứ hai →
lệch khi sửa/xóa đánh giá, mất ghi khi ghi đồng thời. Thay bằng
**`buildCandidateDossier()`** (server/candidates/dossier.ts): lắp MD TƯƠI
mỗi lần hỏi từ dữ liệu gốc — header + CV MD (cache) + `candidates.notes`
(log có timestamp) + đánh giá phỏng vấn + điểm test + chuỗi duyệt (kèm lương
chốt) + lịch sử giai đoạn + phản hồi offer. Với AI thì kết quả y hệt "MD lớn
dần", nhưng không bao giờ lệch và không cần đồng bộ.

Consumers: agent tool mới **`get_candidate_dossier`**; Tóm tắt AI và sinh
câu hỏi phỏng vấn nâng cấp đọc dossier (câu hỏi vòng 2 bám được đánh giá
vòng 1).

### 3. Bulk PDF + cửa vào rõ ràng

- Thả **1–20 PDF** vào dialog upload → tạo ứng viên NGAY, tên tạm từ tên
  file + `source_meta.name_pending=true`; worker parse xong **backfill
  tên/email/SĐT vào Ô TRỐNG** (không bao giờ ghi đè tay HR;
  `backfillContactFields` trong worker).
- **`IntakeDropCard`** — ô "Thả CV (PDF) vào đây — bắt đầu quy trình" nằm
  NGAY ĐẦU cột 📥 Tiếp nhận của kanban; board render cả khi 0 ứng viên.
  Nút workspace đổi thành "Tải CV lên".

### 4. Xóa hẳn module CSV import

CSV không kèm PDF nên ứng viên nhập CSV **không chấm AI được** — đi ngược
pipeline. Bulk PDF thay trọn use-case TopCV. Đã xóa `server/csv-import`,
`components/features/csv-import`, route import, validation + 14 tests. Enum
`csv_import` giữ cho hồ sơ cũ.

## Consequences

- AI không bao giờ đọc PDF trực tiếp; chi phí toMarkdown giảm một nửa ở
  luồng upload đơn (hết convert đôi).
- Dossier không cần invalidation; chỉ CV MD có vòng đời (theo file).
- Migration 0004 phải apply remote trước khi deploy bản này.
