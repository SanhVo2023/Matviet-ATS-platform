# UI/UX Spec — Mắt Việt HR

**Master plan reference:** PART II + III of `~/.claude/plans/mutable-crunching-coral.md`

---

## 1. Brand identity

**Concept:** "Mắt Việt" = "Vietnamese Eye" — precision + clarity + Vietnamese warmth. Clinical optical aesthetic + Excel-familiarity for low-tech HR.

**Voice:** respectful Vietnamese ("chị/anh"), short and actionable. Success: warm and direct. Errors: calm, specific, actionable.

**Brand glyph:** stylized eye with **heart-shaped iris** — communicates "eye + care" (Mắt Việt EYE CARE wordmark). Distinctive and instantly recognizable. Use the glyph alone where space is tight (sidebar collapsed, favicon, app icon).

**Logo files (delivered 2026-04-28 in `app/public/brand/`):**

PNG variants (SVG conversion deferred to v2 nice-to-have):

| File | Glyph color | Wordmark color | Use case | Canonical alias |
|---|---|---|---|---|
| **MV2.png** | Yellow | Navy | **Primary lockup** for white/light backgrounds (most common) | `logo-primary` |
| **MV6.png** | White | Yellow | Full lockup for navy/dark backgrounds (sidebar header) | `logo-on-dark` |
| **MV3.png** | (none — wordmark only) | Navy | Compact wordmark for headers on light bg | `logo-wordmark-navy` |
| **MV5.png** | (none — wordmark only) | Yellow | Compact wordmark for navy bg | `logo-wordmark-yellow` |
| **MV1.png** | Yellow | Yellow | Monochrome yellow for accent placements | `logo-yellow-mono` |
| **MV4.png** | White | Navy | Reverse for yellow-accent backgrounds | `logo-on-yellow` |

**Code mapping:** components reference logos via `LogoLockup` and `LogoWordmark` React components in `src/components/layout/Logo.tsx`. The components select the correct PNG based on a `variant` prop (`primary` | `on-dark` | `on-yellow` | `mono`).

**Glyph-only usage:**
- For the favicon and app icon, the eye glyph needs to be extracted from MV2 (or MV6 for dark variants).
- v1 path: PNG crop of MV2's top portion → `favicon-32.png`, `favicon-180.png` (apple-touch). Generate during Group 1 via Sharp script `scripts/generate-favicons.ts`.
- v2 path: ask designer for SVG source; generate proper multi-size favicons.

**Required derivatives to generate (Group 1 task):**
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png` → packed into `favicon.ico`
- `apple-touch-icon.png` (180×180)
- `og-image.png` (1200×630) — branded social card with logo + tagline "Hệ thống quản lý tuyển dụng thông minh"
- `pwa-icon-192.png`, `pwa-icon-512.png` (manifest, even though we're not yet a PWA — future-proof)

See `app/public/brand/README.md` for the canonical use-case mapping and `docs/runbook.md` §"Generating brand derivatives" for the Sharp script invocation.

---

## 2. Color system

### Brand colors (logo-adjacent surfaces only)

These match the actual logo. Use for: app sidebar background, login page hero, marketing surfaces (OG image, email header). **Don't use for interactive UI elements** — the navy is too dark for buttons/inputs and the yellow is too saturated for status indicators.

```
brand-navy:    #13245C   ← sidebar bg, login hero, og-image bg, email header
brand-yellow:  #FFC107   ← logo accent, OG image accent, special highlights
```

### Primary — Optical Blue (interactive UI)

Tailwind blue scale. Used for buttons, links, focus rings, info badges, active nav state.

```
50:  #EFF6FF   100: #DBEAFE   200: #BFDBFE   300: #93C5FD   400: #60A5FA
500: #3B82F6   600: #2563EB   700: #1D4ED8   800: #1E40AF   900: #1E3A8A
```

Note: `primary-900` (#1E3A8A) is a lighter cousin of `brand-navy` (#13245C). Use brand-navy for the actual sidebar bg; primary-900 for high-emphasis text on light, primary-600 for interactive surfaces.

### Accent — Warm Amber (CTA urgency, "warning" semantic)

Closer to Tailwind amber than the brand's pure yellow. Used for: "needs attention" status badges, urgent CTAs that aren't destructive.

```
400: #FBBF24   500: #F59E0B   600: #D97706
```

The brand-yellow (#FFC107) and amber-500 (#F59E0B) coexist — brand-yellow for logo/marketing surfaces; amber for UI urgency states. They're close enough to feel cohesive but distinct enough to prevent UI confusion.

### Neutrals — Slate
```
50:  #F8FAFC   100: #F1F5F9   200: #E2E8F0   300: #CBD5E1   400: #94A3B8
500: #64748B   600: #475569   700: #334155   800: #1E293B   900: #0F172A
```

### Semantic
```
Success: #059669 (bg #D1FAE5, text #065F46)   "Đã offer"
Warning: #D97706 (bg #FEF3C7, text #92400E)   "Chờ duyệt"
Error:   #DC2626 (bg #FEE2E2, text #991B1B)   "Lỗi"
Info:    #0284C7 (bg #E0F2FE, text #075985)   "Đang xử lý"
```

### Stage badges (avoid aggressive red — use muted rose)
- New/Mới: slate-100 / slate-700
- Screening: primary-100 / primary-700
- Interview: amber-100 / amber-700
- Offer: emerald-100 / emerald-700
- Hired: emerald-600 / white
- Rejected: rose-100 / rose-700 (NOT red)

**WCAG AA contrast on all text/bg pairs verified via axe-core.**

---

## 3. Typography

**Font stack:**
- **Sans (primary):** Be Vietnam Pro 400/500/600/700 — designed for Vietnamese diacritics
- **Mono:** JetBrains Mono 400/500 — IDs, code

**Self-host woff2 in `/public/fonts/`, preload in `<head>`, `font-display: swap`.** Vietnamese subset only.

**Scale (16px root):**
| Token | Size | Usage |
|---|---|---|
| Display | 36px | Page H1, dashboard hero numbers |
| H1 | 28px | Section headers |
| H2 | 22px | Card titles |
| H3 | 18px | Subsection |
| Body-lg | 16px | Default |
| Body | 14px | Tables, form labels |
| Caption | 12px | Metadata, timestamps |
| Micro | 11px | Badges, dense tables |

**Weights:** 700 for dashboard numbers, 600 for H1/H2, 500 for buttons + table headers, 400 for body.

**Line-heights:** 1.25 (headings), 1.5 (body), 1.75 (long-form).

---

## 4. Spacing & layout

8px base. Tailwind tokens.

- Inline gap: 8 / 12 / 16 (default) / 24 / 32
- Section gap: 32px between sections; 48px between page-level groups
- Page padding: 24/32/48 on mobile/tablet/desktop
- Max content width: 1440px centered

**12-column grid, 24px gutter.**

**Breakpoints:** sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536. Primary target: xl (laptop 13–15").

---

## 5. Elevation

5 levels only:
- `shadow-none` — flat (list rows)
- `shadow-sm` — `0 1px 2px rgba(15,23,42,0.06)` — cards resting
- `shadow-md` — cards on hover, dropdowns
- `shadow-lg` — modals, popovers
- `shadow-xl` — active drag (Kanban)

Border radius: `rounded-md` (6px) default, `rounded-lg` (8px) cards, `rounded-full` badges/avatars.

---

## 6. Motion

**Library:** Framer Motion v11 (`motion/react` import).

**Philosophy:** purposeful only. Total budget per screen ≤ 400ms. **`prefers-reduced-motion: reduce` always honored** — fall back to opacity-only or instant.

**Tokens:**
- Duration-fast: 150ms (hover, focus ring)
- Duration-base: 200ms (tab switch, dropdown)
- Duration-medium: 300ms (page transition, modal)
- Duration-slow: 500ms (score reveal, success)
- Easing-smooth: `cubic-bezier(0.4, 0, 0.2, 1)`
- Easing-spring: `{ type: 'spring', stiffness: 400, damping: 30 }`

**Specifics:**
1. Page transitions — fade-in + 4px upward slide, 200ms. Sidebar/topbar persist.
2. Sidebar item hover — bg tint 150ms; active = left-border `primary-500` 3px (no transition on active)
3. Button press — scale 0.98 with spring back; ripple on primary actions
4. Card hover — `shadow-sm` → `shadow-md` 150ms; translate-y -1px
5. Dropdown/popover open — scale 0.95→1 + opacity 0→1, origin at trigger, 200ms
6. Modal/slide-over panel — slide-in from right, 300ms, backdrop fades parallel
7. Toasts — slide-in top-right, 200ms, auto-dismiss 4000ms with progress-bar countdown
8. Kanban drag — `shadow-xl` + 2° rotation + `z-index: 50`; drop zone `primary-400` dashed; release with spring settle
9. **Score reveal** (the one delight moment) — criterion bars animate from 0 to target with 80ms stagger; numbers count up; evidence chips fade in last; total 800ms
10. Skeleton loaders — shimmer gradient 1.5s loop on `slate-100` placeholders
11. Pipeline stage transition — card "flight" animation: fade source, scale-pop destination
12. Empty-state illustrations — subtle 4s float (±4px)
13. Number increments (dashboard cards) — count up from 0 over 600ms on mount only (NOT on data refresh)

---

## 7. Vietnamese copywriting

**Tone:** polite ("chị/anh"), direct, concise.

**Standard lexicon** (use consistently):

| English | Vietnamese |
|---|---|
| Dashboard | Tổng quan |
| Job postings | Tin tuyển dụng |
| Job / Position | Vị trí |
| Candidate | Ứng viên |
| Pipeline | Quy trình |
| Interview | Phỏng vấn |
| Assessment / Test | Bài test |
| Approval | Phê duyệt |
| Email templates | Mẫu email |
| Reports | Báo cáo |
| Referral | Giới thiệu nội bộ |
| Settings | Cài đặt |
| Create / New | Tạo mới |
| Save | Lưu |
| Send | Gửi |
| Cancel | Hủy |
| Approve | Duyệt |
| Reject | Từ chối |
| Score | Điểm |
| Weight | Trọng số |
| Salary | Mức lương |
| Department | Phòng ban |
| Status | Trạng thái |
| Hired | Đã tuyển |

Full i18n source: `docs/content/ui-strings.md`.

---

## 8. Persona-driven Information Architecture

### 8.1 Mobile strategy (locked)

**Persona-scoped, not universal.**

| Route | Desktop | Tablet | Mobile |
|---|---|---|---|
| `/login`, `/auth/*` | ✓ | ✓ | ✓ |
| `/` (HR Dashboard) | ✓ optimized | ✓ usable | ✗ deferred |
| `/` (Manager Inbox) | ✓ | ✓ | ✓ **optimized** |
| `/jobs`, `/jobs/new`, `/jobs/[id]/edit` | ✓ optimized | ✓ usable | ✗ deferred |
| `/jobs/[id]` (overview) | ✓ | ✓ | ✓ readable |
| `/jobs/[id]/pipeline` (kanban) | ✓ optimized | ✓ usable | ✗ deferred |
| `/candidates` (HR pool) | ✓ optimized (Excel-style) | ✓ usable | ✗ deferred |
| `/candidates/[id]` | ✓ | ✓ | ✓ **optimized** |
| `/interviews` (calendar) | ✓ | ✓ | ✗ deferred |
| `/interviews/today` (link list) | ✓ | ✓ | ✓ **optimized** |
| `/interviews/[id]` (review form) | ✓ | ✓ | ✓ **optimized** |
| `/approvals` | ✓ | ✓ | ✓ **optimized** |
| `/emails`, `/tests`, `/reports`, `/settings`, `/admin/*` | ✓ optimized | ✓ usable | ✗ deferred |

### 8.2 Role-scoped sidebar

Manager logs into a different app than HR.

| Item | Admin | HR | Manager |
|---|---|---|---|
| Hộp việc cần làm (`/`) — Manager landing | — | — | ✓ |
| Tổng quan (`/`) — HR landing | ✓ | ✓ | — |
| Tin tuyển dụng | ✓ | ✓ | ✓ (read-only, dept-scoped) |
| Ứng viên | ✓ | ✓ | ✓ (dept-scoped) |
| Phỏng vấn | ✓ | ✓ | ✓ (own assigned) |
| Phê duyệt | ✓ | ✓ | ✓ (own pending) |
| Email | ✓ | ✓ | — |
| Bài test | ✓ | ✓ | — |
| Báo cáo | ✓ | ✓ | ✓ (own dept) |
| Giới thiệu nội bộ | ✓ | ✓ | ✓ |
| Cài đặt | ✓ | — | — |
| Nhật ký hệ thống | ✓ | — | — |

---

## 9. Page specs (key surfaces)

### 9.1 Manager landing — `/` for `role='hiring_manager'`

**"Hộp việc cần làm"** (mobile-first, desktop = 2-col):

```
Chào chị Lan,

[ Cần xử lý ]                  ← top, urgency-sorted
├─ 5 CV chờ duyệt — Vị trí Bán hàng (3 ngày đợi)         [Xem ngay >]
├─ 1 đánh giá phỏng vấn cần điền — Hôm qua, Nguyễn Văn A   [Điền form >]
└─ 1 offer chờ duyệt — Phạm Thị B, hôm nay                [Duyệt >]

[ Lịch phỏng vấn sắp tới ]    ← next 3 days
├─ 10:00 hôm nay  Nguyễn Văn A — Bán hàng     [Mở Teams >]
├─ 14:00 hôm nay  Phạm Thị B  — Bán hàng     [Mở Teams >]
└─ 09:00 mai      Trần Thị C  — Office        [Chi tiết >]

[ Vị trí của tôi ]             ← collapsible
├─ Bán hàng (3 ứng viên đang phỏng vấn)
└─ Kỹ thuật quang học (2 ứng viên chờ duyệt)
```

Empty: "Không có việc cần xử lý. Tốt lắm!" + illustration.
Real-time: Supabase Realtime on `approvals`, `interviews`, `interview_reviews` filtered by manager.

### 9.2 HR Dashboard — `/` for `role='hr_staff'|'admin'`

Lean (NOT Giig-rich):

```
[ Vị trí đang mở: 3 ]  [ CV mới (7 ngày): 12 ]  [ PV hôm nay: 2 ]  [ Chờ duyệt: 4 ]

Phễu tuyển dụng (theo vị trí) ............ Lịch hôm nay
███████ Mới 12                          09:00 Nguyễn Văn A — Sales
██████  Đã chấm 8                       14:00 Phạm Thị B — Office
███     Phỏng vấn 4
██      Offer 2

Cần chị xử lý
Gửi 5 CV cho chị Lan (3 ngày đợi)
Duyệt lương cho ưng viên B (hôm nay)
```

No charts beyond the funnel. No "performance KPI" widgets. Reports page is for that.

### 9.3 Candidate detail — `/candidates/[id]`

**Three-column on desktop; stacks on mobile:**
- Left (280px): profile, contact, source badge, applied-job link, current stage dropdown, **decide buttons** (HR variant: "Đẩy lên Trưởng phòng / Lên lịch PV / Gửi bài test / Từ chối"; manager variant: "Đồng ý phỏng vấn / Cần thêm thông tin / Không phù hợp")
- Center: tabs — CV preview / **Phân tích AI** / Phỏng vấn / Bài test / Email / Phê duyệt / Nhật ký
- Right (320px): activity timeline

**Phân tích AI tab** (the trust-builder):
- Overall weighted score in big circular progress (count-up animation on mount)
- 6 criterion bars — name, score/100, weight %, expandable → reasoning + evidence_quotes with verified/unverified badges
- "Chấm lại" button if `job.weights` updated since last screening (instant re-aggregate; full re-score is async)
- Manual override available (HR only) — slider creates new `ai_screenings` row with `model='manual'`

### 9.4 Other pages

See master plan §18 for full specs:
- `/login`
- `/jobs` (list table)
- `/jobs/new` and `/[id]/edit` (slide-over 640px, 9 sections)
- `/jobs/[id]` (6-tab detail)
- `/candidates` (Excel-style table)
- `/interviews` (calendar + list view toggle)
- `/interviews/[id]` (detail + review form)
- `/approvals` (queue)
- `/emails` (templates + logs)
- `/tests` (v1 list; v2 builder stub)
- `/reports` (6 charts + export)
- `/referrals/new`
- `/settings/*` (admin only — users, departments, templates, weights, integrations health)
- `/admin/audit` (admin only)

---

## 10. Design patterns

### Forms
- Input height 40px; `slate-200` border; focus `primary-500` 2px ring
- Label above input, `text-sm font-medium`, required = small `primary-500` asterisk
- Helper below `text-xs text-slate-500`; errors replace helper
- Validation on blur (not keystroke), real-time for password
- Long forms split into cards with section headings; sticky save bar bottom
- **Autosave drafts every 5s of inactivity**
- Libraries: react-hook-form + Zod + shadcn/ui

### Tables (HR's primary pattern)
- Row height 56px (compact: 40px)
- Sticky header with sort indicator; click to sort; shift-click multi-sort
- Row hover `slate-50`; inline action buttons reveal on hover
- Row click navigates to detail (whole row clickable, `aria-label`)
- Selection: leading checkbox; bulk action bar slides up bottom when ≥1 selected
- Empty state: illustration + helpful text + primary CTA
- Pagination bottom-right; "1–20 trong 157"; page size 20/50/100
- Sticky filter bar above; URL-synced filters
- Export menu top-right: CSV / Excel / PDF (respects active filters)

### Slide-over vs modal
- **Slide-over (right, 480–640px wide):** data-heavy forms (job CRUD, candidate detail, email compose). Non-blocking.
- **Modal (centered, 480px max):** confirmations, destructive actions.
- **Toast (top-right):** ephemeral feedback.
- **Inline banner (top of page):** persistent warnings ("SPF chưa cấu hình — email có thể vào spam").

### Empty states
4 illustrations needed (line art, `primary-300` accent, slate base, SVG):
- `empty-candidates.svg`
- `empty-jobs.svg`
- `empty-pipeline.svg`
- `empty-notifications.svg`
- `empty-search.svg`

### Status badges
Uniform pill: `px-2 py-0.5 rounded-full text-xs font-medium`. Bg + text per stage palette.

---

## 11. Accessibility

- WCAG 2.1 AA
- axe-core in Playwright on 5 critical pages per CI run
- Every interactive reachable via keyboard; visible focus ring (`primary-500` 2px offset); skip link "Bỏ qua đến nội dung"
- Semantic HTML; ARIA labels for icon-only buttons; `aria-live` for dynamic counts
- Vietnamese diacritics tested with common names (Nguyễn, Trần, Lê, Đỗ, Bùi)
- 200% zoom usable (no horizontal scroll on primary pages)
- `prefers-reduced-motion` honored

---

## 12. Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Global search (candidates + jobs) |
| `G` then `D` | Go to Dashboard |
| `G` then `J` | Go to Jobs |
| `G` then `C` | Go to Candidates |
| `G` then `I` | Go to Interviews |
| `N` | Create new (contextual) |
| `E` | Edit (on detail page) |
| `Esc` | Close modal / slide-over |
| `?` | Show shortcuts modal |

---

## 13. What we copy from Giig Hire vs explicitly differ

**Copy:** sidebar pattern, big colored stat cards, time-period tabs (Năm/Quý/Tháng/Tuần), pipeline kanban with avatar+name+role-pill, single primary "+ Tạo mới" button in topbar, search bar at top.

**Differ:**
- "Status Not Set" default column → meaningful Vietnamese stage names from row 1
- 8+ dashboard widgets → 4 cards + funnel + today + wait-for-me
- Recruiting-agency vocabulary ("Deal Activity", "Send To Job") → internal-HR Vietnamese ("Đã offer", "Đã tuyển")
- Performance KPI widget on dashboard → Reports page only
- Onboarding completion ring → empty-state CTAs
- Multi-portal (jobs/candidates/companies/contacts) → single recruiting flow

---

## 14. References

- Master plan PART II + III
- ADR-0005 — Persona-scoped mobile strategy
- ADR-0003 — No AI Chat panel v1
- Brand assets: `public/brand/` (delivered by designer pre-Group 1)
- i18n: `docs/content/ui-strings.md`
