# Scoring Rubrics — per role family

**Status:** Approved (2026-04-28)
**Approver:** Sanh Võ on behalf of HR + Trưởng phòng. Per-role-family validation by each Trưởng phòng remains an open follow-up but doesn't block Group 1-2; rubric is locked for initial Gemini scoring in Group 3 and can be tuned in-place via `weight_templates` + `criteria_config` updates without code changes.

**Purpose:** AI scoring guidance for Gemini. Each role family defines, per criterion, "what 90 looks like" / "what 50 looks like" / "what 20 looks like" so Gemini's prompt has concrete calibration text.

**Used by:** `src/lib/ai/gemini/score-cv.ts` — these rubric texts are concatenated into the scoring prompt as `criteria_config[criterion].guidance`.

**Default weights** are stored in `weight_templates` table and pre-fill new jobs; HR can adjust per job.

---

## 1. Sales (Nhân viên bán hàng)

### Default weights
| Criterion | Weight |
|---|---|
| industry_fit | 0.20 |
| professional_skills | 0.20 |
| work_experience | 0.20 |
| years_experience | 0.15 |
| education | 0.10 |
| location | 0.15 |

### Rubric guidance per criterion

#### `industry_fit` (0.20) — Phù hợp ngành nghề
- **90+:** Có kinh nghiệm bán lẻ trực tiếp tại các chuỗi tương tự (kính mắt, đồng hồ, mỹ phẩm, thời trang). Hiểu khách hàng dịch vụ.
- **70-89:** Có kinh nghiệm bán hàng tại cửa hàng/showroom (không nhất thiết kính mắt).
- **50-69:** Có kinh nghiệm dịch vụ khách hàng trực tiếp (F&B, telesales, lễ tân) nhưng chưa làm bán lẻ.
- **30-49:** Có làm việc với khách hàng nhưng không bán hàng (vd: customer support).
- **<30:** Hoàn toàn không có kinh nghiệm dịch vụ khách hàng / bán hàng.
- **Keywords gợi ý:** `bán lẻ`, `cửa hàng`, `showroom`, `khách hàng`, `tư vấn`, `optical`, `kính mắt`, `mỹ phẩm`, `thời trang`

#### `professional_skills` (0.20) — Kỹ năng chuyên môn
- **90+:** Kỹ năng bán hàng được chứng minh (chỉ tiêu doanh số đạt, được training chuyên sâu, có chứng chỉ). Giao tiếp Việt-Anh tốt nếu vị trí flagship/cao cấp.
- **70-89:** Có kinh nghiệm thực tế bán hàng + giao tiếp tốt.
- **50-69:** Giao tiếp ổn, có thể đào tạo về sản phẩm.
- **30-49:** Hạn chế trong giao tiếp khách hàng, cần đào tạo cơ bản.
- **<30:** Không có kỹ năng giao tiếp / bán hàng nào nêu rõ.

#### `work_experience` (0.20) — Kinh nghiệm làm việc
- Đánh giá chất lượng (vai trò + công ty + thành tựu) hơn là chỉ số năm.
- **90+:** Đã đảm nhận nhân viên bán hàng cao cấp / supervisor tại chuỗi bán lẻ uy tín, có thành tích cụ thể (vd: vượt KPI 120%).
- **70-89:** Bán hàng trong 1+ năm có thành tích đo được.
- **50-69:** Bán hàng nhưng không nêu rõ thành tích.
- **30-49:** Có làm bán hàng ngắn hạn (<6 tháng) hoặc thời vụ.
- **<30:** Không có kinh nghiệm bán hàng nào liệt kê.

#### `years_experience` (0.15) — Số năm kinh nghiệm
- Yêu cầu mặc định cho NV bán hàng: 1+ năm bán lẻ.
- **100:** ≥3 năm.
- **80:** 2-3 năm.
- **60:** 1-2 năm.
- **40:** 6-12 tháng.
- **20:** <6 tháng hoặc fresher.

#### `education` (0.10) — Trình độ học vấn
- **90+:** Cao đẳng/đại học các ngành liên quan (Kinh tế, Marketing, QTKD, Bán hàng).
- **70-89:** Cao đẳng/đại học bất kỳ ngành.
- **50-69:** Tốt nghiệp THPT + chứng chỉ nghề bán hàng.
- **30-49:** Tốt nghiệp THPT, không có chứng chỉ.
- **<30:** Chưa tốt nghiệp THPT.

#### `location` (0.15) — Địa điểm
- **100:** Cùng quận/khu vực với cửa hàng.
- **80:** Cùng thành phố, di chuyển <30 phút.
- **60:** Cùng thành phố, di chuyển 30-60 phút.
- **40:** Tỉnh lân cận, có thể chuyển đến nếu được hỗ trợ.
- **<40:** Khoảng cách lớn, không khả thi.

---

## 2. Optical Tech (Kỹ thuật viên quang học)

### Default weights
| Criterion | Weight |
|---|---|
| industry_fit | 0.25 |
| professional_skills | 0.30 |
| work_experience | 0.15 |
| years_experience | 0.10 |
| education | 0.15 |
| location | 0.05 |

### Rubric guidance per criterion

#### `industry_fit` (0.25) — Phù hợp ngành nghề
- **90+:** Có chứng chỉ kỹ thuật viên quang học (kỹ thuật khúc xạ) + đã làm việc tại cửa hàng kính mắt.
- **70-89:** Có chứng chỉ quang học nhưng kinh nghiệm ngắn hoặc tại nha khoa / y tế lân cận.
- **50-69:** Có nền tảng kỹ thuật y tế (điều dưỡng, dược, phòng lab) nhưng chưa làm quang học.
- **30-49:** Nền tảng kỹ thuật chung (điện tử, cơ khí precision).
- **<30:** Hoàn toàn không có kỹ thuật.

#### `professional_skills` (0.30) — Kỹ năng chuyên môn
- **90+:** Đo khúc xạ, làm đeo kính, gọt mài tròng kính bằng máy chuyên dụng (Pattern Free, Auto Edger). Hiểu sản phẩm tròng đa chức năng (đa tiêu cự, blue light, transition).
- **70-89:** Có kỹ năng đo khúc xạ + lắp ráp cơ bản.
- **50-69:** Đã được đào tạo cơ bản, cần training thêm.
- **30-49:** Có kiến thức nền nhưng chưa thực hành.
- **<30:** Không có kỹ năng quang học.

#### `work_experience` (0.15) — Kinh nghiệm làm việc
- **90+:** Làm tại cửa hàng kính mắt uy tín (chuỗi lớn, lab quang học) >2 năm.
- **70-89:** 1-2 năm tại cửa hàng kính mắt.
- **50-69:** Thực tập / part-time tại cửa hàng kính mắt.
- **30-49:** Kỹ thuật y tế khác.
- **<30:** Không có kinh nghiệm liên quan.

#### `years_experience` (0.10), `education` (0.15), `location` (0.05) — như Sales

#### `education` (0.15) — bổ sung
- **90+:** Cao đẳng/Đại học chuyên ngành Quang học, Y học, Kỹ thuật y tế. Có chứng chỉ KTV khúc xạ của Bộ Y tế.
- **70-89:** Cao đẳng kỹ thuật y tế bất kỳ.
- **50-69:** Trung cấp kỹ thuật.
- **<50:** Không có học vấn kỹ thuật.

---

## 3. Office (Văn phòng)

### Default weights
| Criterion | Weight |
|---|---|
| industry_fit | 0.15 |
| professional_skills | 0.25 |
| work_experience | 0.20 |
| years_experience | 0.15 |
| education | 0.15 |
| location | 0.10 |

### Rubric guidance per criterion

Generic office roles (HR, Kế toán, Marketing, Admin, IT support). Rubric calibration adjusts based on `job.title`:

#### `industry_fit` (0.15) — Phù hợp ngành nghề
- Bán lẻ / FMCG / dịch vụ tốt hơn nền B2B thuần túy. Văn phòng hỗ trợ hoạt động cửa hàng được điểm cao hơn nếu có bối cảnh retail.

#### `professional_skills` (0.25) — Kỹ năng chuyên môn
- Đánh giá theo từng vị trí cụ thể:
  - **HR:** tuyển dụng, đào tạo, lương thưởng, BHXH, luật lao động.
  - **Kế toán:** Misa/Fast/Bravo, kê khai thuế, báo cáo tài chính, kiểm toán nội bộ.
  - **Marketing:** social media, content, hiệu quả ROAS, data driven.
  - **Admin:** Excel, ngoại ngữ, quản lý văn phòng, hậu cần.
  - **IT support:** mạng nội bộ, quản trị máy chủ, hỗ trợ end-user.

#### `work_experience` (0.20) — Kinh nghiệm làm việc
- Quy mô công ty trước đó tương đương (50-500 nhân sự) cộng điểm.

#### `years_experience` (0.15), `education` (0.15), `location` (0.10) — chuẩn

---

## 4. Management (Cấp quản lý)

### Default weights
| Criterion | Weight |
|---|---|
| industry_fit | 0.20 |
| professional_skills | 0.20 |
| work_experience | 0.25 |
| years_experience | 0.20 |
| education | 0.10 |
| location | 0.05 |

### Rubric guidance per criterion

#### `industry_fit` (0.20) — Phù hợp ngành nghề
- **90+:** Đã quản lý chuỗi cửa hàng bán lẻ (kính mắt, F&B, mỹ phẩm) >50 nhân viên.
- **70-89:** Đã quản lý cửa hàng đơn lẻ trong ngành bán lẻ.
- **50-69:** Quản lý ngành dịch vụ khác (KS, F&B).
- **30-49:** Quản lý team văn phòng nhưng không retail.
- **<30:** Không có kinh nghiệm quản lý.

#### `professional_skills` (0.20) — Kỹ năng chuyên môn
- Lãnh đạo team, quản lý KPI, P&L cửa hàng, đào tạo nhân sự, xử lý khiếu nại VIP. Anh/Trung văn nếu vị trí tiếp xúc khách quốc tế.

#### `work_experience` (0.25) — Kinh nghiệm làm việc
- **90+:** Quản lý cửa hàng / chuỗi >5 năm với tăng trưởng doanh số đo được.
- **70-89:** Quản lý 3-5 năm.
- **50-69:** Quản lý 1-3 năm hoặc supervisor lâu năm.
- **30-49:** Mới lên quản lý.
- **<30:** Chưa có vai trò quản lý chính thức.

#### `years_experience` (0.20)
- **100:** ≥7 năm tổng.
- **80:** 5-7 năm.
- **60:** 3-5 năm.
- **40:** 1-3 năm.
- **<40:** dưới 1 năm.

#### `education` (0.10) — chuẩn nhưng nâng nhẹ điểm cho MBA / chứng chỉ quản lý.

#### `location` (0.05) — ít quan trọng, lãnh đạo có thể di chuyển nhiều giữa cửa hàng.

---

## Open follow-ups (post-approval refinements)

- [ ] Trưởng phòng Bán hàng spot-check rubric Sales after Group 3 ships and 5 real CVs are scored
- [ ] Trưởng phòng Kỹ thuật spot-check rubric Optical Tech after Group 3 ships
- [ ] Calibration check after first 10 real CVs scored — adjust default weights if score distribution looks off
- [ ] Consider 5th role family if needed (Marketing chuyên sâu, Trainer, ...) — additive change, no schema impact
