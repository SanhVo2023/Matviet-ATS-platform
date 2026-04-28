# PRD — Mắt Việt HR

**Version:** v3.0 (extracted from master plan v5.0, 2026-04-21)
**Status:** Approved — ready for build
**Master plan:** `~/.claude/plans/mutable-crunching-coral.md`

---

## 1. Background

Mắt Việt (chuỗi bán lẻ kính mắt) currently runs hiring entirely on Excel + Outlook + OneDrive. Sole HR: **chị Bùi Thị Hương**, 3 years experience.

Current flow: phòng ban đề xuất → xin headcount Tập đoàn → đăng tin TopCV → lọc CV trên web → tải về OneDrive → gửi email cho Trưởng phòng → set phỏng vấn → offer.

HR's direct quote (07/04/2026): *"Tôi cần 1 phần mềm tiện lợi, dễ sử dụng, không mất nhiều thời gian. Đảm bảo chất lượng hồ sơ theo đúng tiêu chí tuyển dụng theo từng vị trí."*

**Pain points (HR-ranked):**
1. Manual CV screening takes too long
2. No consistent way to compare candidates
3. CVs scattered across sources
4. Reporting is hard

**Scale:** 1–3 jobs/month · 20–50 CVs/job · 2–4 weeks time-to-hire · ≤5 users · ≤5 outbound emails/day

---

## 2. Goals

| # | Goal | Measure |
|---|---|---|
| G1 | Reduce CV screening time by 70% via AI ranking | Compare time spent screening 50 CVs pre- vs post-launch |
| G2 | Centralize 100% of CV intake | OneDrive workflow retired within 2 weeks of soft launch |
| G3 | Automate recruitment emails | Zero manually-composed emails after Group 6 ships |
| G4 | Dashboards for leadership | Monthly reports auto-export without HR editing |
| G5 | Auditable approval flow | 100% of hire decisions logged with actor + timestamp |

---

## 3. Personas & devices

| Persona | Frequency | Primary device | JTBD | Emotional driver |
|---|---|---|---|---|
| **HR Staff** (chị Hương) | Daily, 80% of sessions | Laptop at desk | Triage CVs, push to managers, schedule interviews, chase replies, monthly reports | Don't waste my time; show me what's stuck |
| **Hiring Manager** (Trưởng phòng) | Bursty, 1-2× per week | **Phone on store floor** + occasional laptop | Review the shortlist HR pushed; decide approve/reject; do interviews; fill review form | Decide quickly between customers |
| **BOD / Tập đoàn** | Rare, only management hires | Phone (busy execs) | Approve final offer for management-level hires | 30 seconds, on the way somewhere |
| **Candidate** | Email-only | n/a (no app account) | Know status, prepare for interview, get final answer | Respect, clarity, dignity |

---

## 4. Locked product decisions (2026-04-21)

| Area | Decision |
|---|---|
| **Language** | Vietnamese-only UI. No EN/VN toggle. |
| **Scope** | All 11 FRs from PRD in full. No trade-offs. |
| **TopCV ingestion** | Phase A (ship first): manual CSV + email-forwarding fallback. Phase B (post-launch): real TopCV API once credentials confirmed. |
| **Line Manager access** | Full Supabase Auth login (`hiring_manager` role), scoped by department + `job_assignments`. |
| **Email automation** | Hybrid: auto for low-stakes (receipt ack, reminders); HR-approved preview for high-stakes (interview invite, offer, rejection). Per-template `requires_approval` flag. |
| **AI architecture** | Decoupled per-criterion scoring; raw scores stored, weighted total computed at query time. Async queue. Evidence quote validation via fuzzy match. See ADR-0004. |
| **Scoring weights** | Role-family templates (Sales / Optical Tech / Office / Management) + per-job slider override. |
| **Assessment** | v1: file-upload + email flow. v2 (post-launch): full form builder. Schema reserved for v2. |
| **Approval flow** | Two hardcoded presets. Staff: HR+TP đề xuất → HR deal lương → Offer. Management: HR+TP → BOD → Tập đoàn → Offer. |
| **CV fairness** | No PII stripping. Raw CV fed to Gemini. Audit logged. |
| **Migration** | Fresh start. OneDrive remains archive. |
| **Launch** | Soft launch: 1 real position runs in parallel with Excel for 2 weeks → cutover. |
| **Mobile strategy** | Persona-scoped — manager review/decide flow + interview form mobile-optimized; HR power-user surfaces (dashboard, jobs CRUD, kanban, reports, settings) desktop-first. |
| **No AI Chat panel** | Score Card with 6 criteria + verified evidence quotes is sufficient. See ADR-0003. |
| **Email provider** | Microsoft Graph only (outbound + inbound + calendar). Resend rejected — broken reply threading to Outlook. See ADR-0002. |

---

## 5. Functional requirements

| ID | Feature | Description |
|---|---|---|
| **FR-01** | Dashboard | 4 stat cards (open jobs, new CVs, today's interviews, pending approvals) + funnel + today list + "wait for me" list. Filter by date range and department. Auto-refresh every 60s. |
| **FR-02** | Jobs CRUD | Job lifecycle (draft / open / paused / closed / filled). 9-section form: basics, role family + flow type, JD (Tiptap), requirements, salary range, weights editor (6 sliders summing to 100%), hiring manager, assigned tests, enabled email templates. Autosave drafts every 5s. |
| **FR-03** | Multi-source CV import | Sources: manual upload (drag-drop PDF/DOCX), email inbox poller (every 5min on hr@matviet.com.vn), CSV import (TopCV/CareerViet exports), TopCV API (Phase B), referral form. All converge into `candidates` with normalized `source` field. |
| **FR-04** | AI CV Screening | Gemini 2.5 Flash two-pass: parse PDF→structured JSON, then score 6 criteria with evidence quotes. Decoupled storage (raw per-criterion + query-time weighted aggregate). Async queue. Fuzzy evidence validation. Failure = "screening failed" badge + retry button + manual scoring fallback. |
| **FR-05** | Pipeline | Dual view — Excel-style table (HR preferred) + Kanban (drag-drop). 8 stages from Mới → Đã tuyển/Từ chối. Bulk actions: stage, email, export, delete. URL-shareable filter state. |
| **FR-06** | Email automation | MS Graph send via hr@matviet.com.vn. React Email templates with variable placeholders. Hybrid mode: auto for receipt_ack + reminder_24h; HR-approved preview for interview_invite, offer, rejection. Threading via `conversationId`. |
| **FR-07** | Interview scheduling | Outlook calendar events via Graph. Teams link auto-gen (`isOnlineMeeting:true`). Conflict detection. Calendar + list views. Reschedule, cancel with auto-notification. |
| **FR-08** | Interview review form | 6 sliders (Chuyên môn, Kỹ năng mềm, KN liên quan, Văn hóa, Tiềm năng, Thái độ) + textareas (Điểm mạnh, Điểm cân nhắc) + đề xuất lương + radio (Rất nên / Nên / Cân nhắc / Không tuyển) + ghi chú nội bộ (HR-only). Aggregate view if multiple reviewers. |
| **FR-09** | Approval workflow | Two hardcoded presets (Staff 3-step / Management 4-step). Auto email to next actor at each step. Reject → resets to step 1 with reason. Full history in `approvals` table (one row per step). |
| **FR-10** | Reports & analytics | 6 charts: funnel, time-to-hire by role family, source effectiveness, AI score distribution, stage conversion %, hires per month. Filter by date + department + job. Export PDF (`@react-pdf/renderer`) + Excel (`exceljs`). |
| **FR-11** | Assessments | v1: HR uploads test file per job → "Send test" emails secure signed URL (48h expiry) → candidate replies with answer file → poller matches `In-Reply-To` → HR uploads + scores. v2: drag-drop form builder with auto-scoring (folders/columns reserved). |

---

## 6. Non-functional requirements

| ID | Requirement | Standard |
|---|---|---|
| NFR-01 | Performance | Page load < 2s. AI scoring < 60s/CV. API p95 < 500ms. |
| NFR-02 | Security | Supabase RLS on every table. HTTPS everywhere. Secrets in env vars only. ApplicationAccessPolicy restricts MS Graph app to hr@ mailbox. |
| NFR-03 | Availability | 99.5% uptime (Supabase + Netlify SLA). Sentry + Better Stack monitoring. |
| NFR-04 | Responsive | Laptop 13–15" optimized. Tablet usable. Mobile **persona-scoped** (manager flow optimized; HR surfaces desktop-first). |
| NFR-05 | Language | 100% Vietnamese UI/email/errors. Be Vietnam Pro font. |
| NFR-06 | Data | Supabase Pro PITR (2-min RPO, 7-day retention). Export CSV/Excel anytime. |
| NFR-07 | Usability | HR proficient after 1× 2-3h training. No manual needed for happy path. |
| NFR-08 | Scalability | Schema supports multi-department. 10–20 users + 100–500 CV/month without rewrite. |
| NFR-09 | Accessibility | WCAG 2.1 AA. axe-core in CI. Keyboard fully accessible. `prefers-reduced-motion` respected. |
| NFR-10 | Email deliverability | SPF + DKIM + DMARC live on matviet.com.vn before Group 6. mail-tester.com score ≥ 9/10. |

---

## 7. AI scoring criteria (HR-ranked priority)

| # | Criterion | Default weight (Sales) |
|---|---|---|
| 1 | Industry fit (`industry_fit`) | 0.20 |
| 2 | Professional skills (`professional_skills`) | 0.20 |
| 3 | Work experience (`work_experience`) | 0.20 |
| 4 | Years of experience (`years_experience`) | 0.15 |
| 5 | Education (`education`) | 0.10 |
| 6 | Location (`location`) | 0.15 |

Each scored 0-100 with reasoning + evidence_quotes (verified via fuzzy-match against parsed CV).

**Weight templates per role family:**

| Role family | industry_fit | skills | exp | years | edu | loc |
|---|---|---|---|---|---|---|
| Sales | 0.20 | 0.20 | 0.20 | 0.15 | 0.10 | 0.15 |
| Optical Tech | 0.25 | 0.30 | 0.15 | 0.10 | 0.15 | 0.05 |
| Office | 0.15 | 0.25 | 0.20 | 0.15 | 0.15 | 0.10 |
| Management | 0.20 | 0.20 | 0.25 | 0.20 | 0.10 | 0.05 |

---

## 8. Out of scope (explicit non-goals)

- Candidate-facing portal (per locked decision; candidates use email only)
- Payroll / HR admin beyond hiring
- Onboarding workflow post-hire
- Mobile native app (web responsive only, persona-scoped)
- VietnamWorks API (HR didn't rank as primary source)
- Multi-language UI (Vietnamese only)
- Candidate de-duplication via persons master table (v2; flat candidates table for v1 — see ADR-0008)

---

## 9. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| TopCV API credentials unavailable | Medium | Phase A (CSV + email forwarding) doesn't depend on it |
| SPF/DKIM not configured → spam folder | High if missed | Ticket DNS admin Week 1; verify with mxtoolbox before Group 6 |
| Azure AD admin consent delay | Medium | Escalate Week 1; IMAP/SMTP fallback documented |
| Gemini quota / model deprecated | Low | Abstraction layer; can swap to Gemini 1.5 Flash or Vertex |
| AI scoring not trusted by HR | Medium | Per-criterion evidence quotes; verified badge; HR override; retry |
| Solo dev (Sanh) bandwidth | Medium | Documented runbook; CLAUDE.md as session entry; build-log.md for resume cold |
| LibreOffice DOCX worker down | Low | Reject .docx upload with "Vui lòng convert PDF" fallback message |

---

## 10. Acceptance criteria

### Per-feature module
- UI matches design system (`docs/ui-ux.md`)
- Copy 100% Vietnamese via type-safe `i18n.ts`
- Loading / empty / error states implemented
- Keyboard accessible + screen-reader labels
- `prefers-reduced-motion` respected
- RLS verified cross-role
- Unit tests for pure logic + E2E happy path
- Sentry error boundary at route level
- Audit log entries for mutations

### Production launch
- 10 E2E test scenarios pass
- axe-core clean on 5 critical pages
- 100-CV scoring load test < 30s p95
- HR completes one real hire on staging
- Deliverability test: gmail/yahoo/outlook all inbox
- Production URL live at `hr.matviet.com.vn`
- Sentry + Better Stack active
- User guide PDF approved
- 2× training sessions delivered
- Soft launch dual-run 2 weeks without blocker

---

## 11. References

- Master build plan: `~/.claude/plans/mutable-crunching-coral.md` (v5.0)
- Architecture (DB schema, RLS, folder layout): `docs/architecture.md`
- UI/UX spec: `docs/ui-ux.md`
- Integrations: `docs/integrations.md`
- API: `docs/api.md`
- ADRs (decisions): `docs/decisions/`
- Original survey: `Phieu_Khao_Sat_Tuyen_Dung.pdf` + `kết quả Phieu_Khao_Sat_Tuyen_Dung.docx`
- Previous PRDs: `Mat_Viet_Hiring_PRD.docx` (v1.0), `docs/PRD-v2.md` (v2.0)
