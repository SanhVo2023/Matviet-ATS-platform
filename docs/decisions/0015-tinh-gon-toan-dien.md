# ADR 0015 — Tinh gọn toàn diện: merge features, AI fills forms

**Date:** 2026-07-06 · **Status:** Accepted · **Owner:** Sanh Võ (plan approved in chat)

## Context

Chị Hương (primary HR user) reported the app was too complicated — too many
text boxes, too many steps. A form/flow audit quantified it: the email
composer required hand-typing up to 7 template variables the system already
knew; the candidate form re-asked for name/email/phone that were in the CV;
the job form had ~12 controls; the kanban rendered ~15 columns; a staff
approval had 3 steps of which 2 were HR approving herself.

## Decision — the operating principle is "HR confirms, AI types"

1. **Composer vars auto-resolve** (`server/email/composer-defaults.ts`):
   candidate/job/next-interview/assessment data fills interview_time, salary,
   interviewers, deadline, department, start_date, time_limit…; resolved vars
   collapse to a "✓ Đã tự điền" summary with a Sửa toggle. Manual inputs only
   for what the system can't know.
2. **CV-drop prefill**: dropping a PDF runs shared text extraction
   (`server/scoring/extract-text.ts`, also used by the scoring worker) +
   regex (email/phone) + one small AI call (name) → the three contact fields
   arrive pre-filled and editable. Best-effort: upload never blocks on it.
3. **Job form = 3 essential fields** (title, role family, location) + one
   "✨ AI soạn toàn bộ" button (description + requirements + scoring weights
   in one click); everything else folds under "Tuỳ chọn nâng cao" (open by
   default when editing). Department + hiring manager are no longer publish
   blockers — notification fan-out already falls back to hr+admin.
4. **Approvals streamlined**: presets shrink to staff=[manager_recommend],
   management=[manager, bod, tap_doan]. Clicking **"Đề xuất tuyển"** IS the HR
   recommendation — no self-approval steps; salary is recorded at offer
   compose time ({{salary}} auto-var), not as an approval step. The Phê duyệt
   page gained one-tap Duyệt/Từ chối per row (mobile managers). Legacy
   in-flight chains (hr_recommend/salary_deal rows) keep rendering and stay
   decidable — enum + labels retained, no data migration.
5. **Kanban shows 7 super-columns** (Mới / Sàng lọc / Phỏng vấn & Test /
   Phê duyệt / Offer / Đã tuyển / Đóng) — **board-only**: the DB keeps all 16
   detailed stages, so history, reports, notifications, offer links and all
   agent tools are untouched. Cards show the detailed stage as a badge; the
   table view's StageDropdown still reaches every sub-stage. Dropping into
   "Phê duyệt" starts the approval chain (idempotent; re-drop toasts "đã
   có"); group targets resolve through `resolveGroupTarget` so hired→Đóng
   correctly lands on `withdrew`.
6. **Dashboard leads with "Hôm nay cần làm"** — a single action inbox
   (pending approvals, emails awaiting send-approval, today's interviews,
   unanswered offers, stale CVs) with one-click links; counters stay below.
7. **Weights editor auto-balances** (drag one slider, the rest redistribute;
   total is always exactly 100%) + "AI đề xuất" suggests a distribution.
8. **User admin**: per-row edit role/department/name/phone, deactivate (with
   instant session revoke) / reactivate, send-reset-email; TopBar avatar menu
   gives every user self-service "Đổi mật khẩu (gửi link qua email)".

## Consequences

- HR's happy path per candidate drops from ~10 interactions to ~4: drop CV →
  confirm → (AI scores) → Đề xuất tuyển → compose offer from template with
  zero typed variables.
- The 16-stage enum is now an internal vocabulary; user-facing surfaces speak
  7 groups. Any future stage additions must update `STAGE_GROUPS`.
- New approval chains have no hr_recommend/salary_deal rows — reports that
  count steps see shorter chains from 2026-07-06 onward.
