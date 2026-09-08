# PRD — Mắt Việt HRM (Agentic employee-lifecycle system)

**Version:** v1.0 (draft for review)
**Status:** Proposed — awaiting Sanh's approval to phase into build groups
**Date:** 2026-09-08
**Author:** Claude Code, under Sanh Võ's review
**Supersedes/extends:** `docs/PRD.md` (v3.0, ATS) — the ATS becomes the *Recruiting* module of this system
**Anchors:** ADR 0012 (person-centric foundation), ADR 0020 (propose-first agent architecture), ADR 0013 (Workers AI), ADR 0022 (shadcn/light-only)

---

> ## ⚠ Scope update — 2026-09-08 (Sanh), folded into this PRD
>
> - **Fastwork API integration is DEFERRED.** Sanh cannot provide API access yet and is working with HR on it. Until then the HRM **stands alone on D1** — v1 does **not** depend on Fastwork. Attendance/payroll stay in Fastwork as they are today; the sync spine (§9.1) becomes a *later, optional* phase, and the CSV fallback is used only if/when Sanh chooses to bridge.
> - **Mắt Việt is part of EssilorLuxottica.** Employees already have a corporate **"personal desk"** (ESS) where they **view payslips** and **upload OKR**. → Our app does **not** rebuild payslip viewing or OKR upload — that boundary belongs to the EssilorLuxottica desk. *(Assumption to confirm: the personal desk is a separate corporate system from Fastwork.)*
> - **OKR / KPI / performance is OUT of scope for v1 — leave as-is.** Today it is fully manual: employees submit objectives agreed with their line manager, scoring is manual, **there is no cross-check or verification** that the scoring is sound, and OKR only affects the **year-end bonus**. Sanh needs **BOD confirmation** before we touch it, so v1 does not. *(The "no verification of manual scoring" gap is recorded as a future opportunity in §5.10.)*
> - **v1 = HRM basics only.** Employee records, org, onboarding, contracts & compliance clocks, leave, offboarding, documents/policies, light self-service (minus payslip/OKR), analytics, comms. Recruiting (ATS) already shipped. The `[BUILD]/[INTEGRATE]/[DEFERRED]/[OUT v1]` tags in §5 reflect this.

---

## 0. One-paragraph thesis

Mắt Việt already runs **Fastwork** for the two hardest, most entrenched HR functions — **chấm công** (FaceID/GPS timesheet) and **tính lương** (payroll). Those are legal records tied to physical hardware across every store; we do not rebuild them. Instead, this app becomes the **agentic employee-lifecycle brain** — the *system of engagement* — that owns everything from first CV to last working day (hire → onboard → manage → develop → offboard) plus the **person master**, and treats Fastwork as the **system of record for time & money**, syncing on the shared spine. The UI stays a **traditional, familiar HRM** (employee list, org chart, leave calendar, review cycle); underneath, an **agent per employee** prepares the work and the human approves with **one tap** — the exact propose-first model already proven in the ATS "Hôm nay" feed (ADR 0020). The result: a full-function HRM for a ~200-person optical retail chain that feels effortless to a low-tech HR team of one, and gives ~200 store staff a dead-simple Vietnamese mobile self-service.

---

## 1. Background & why now

- The ATS is **live in production** at `hr.matviet.com.vn` on Cloudflare (Workers + D1 + R2 + Queues + Cron + Durable Objects), with the agent-driven, propose-first model shipped (ADR 0020) and the HRIS foundation reserved since ADR 0012.
- ADR 0012 deliberately laid a **person-centric core** now and deferred the HRIS build: `people` is the identity anchor; `candidates` link to a person; `employees`/`departments`/`positions` tables exist but stay empty; `src/lib/modules.ts` already declares `employees` (`/nhan-vien`), `org` (`/phong-ban`), and `leave` (`/nghi-phep`) **dark** (`enabled: false`) in the `hris` group. This PRD is the green-light to **activate that foundation** and grow outward — not a greenfield rewrite.
- Mắt Việt currently operates **Fastwork** (fastwork.vn) — a Vietnamese all-in-one business platform whose **HRM+ suite** includes Staff (hồ sơ), Hiring, Timesheet (chấm công FaceID/GPS), Payroll (tính lương), KPI, Asset, News, Staffing. Fastwork exposes a **permission-gated company "API code"** but **no public REST/webhook documentation**. **As of 2026-09-08 we do not have API access** (Sanh working with HR), so **v1 does not integrate Fastwork** — the integration seam (§9.1) is designed defensively (API when available, CSV fallback) for the later **D-FW** train.
- Mắt Việt is part of **EssilorLuxottica**. Employees already have a corporate **"personal desk"** (ESS) where they **view payslips** and **upload OKR** — a boundary our app respects rather than rebuilds (see the scope-update box above).

**Why now:** the ATS proves the agentic pattern works and the person master already exists. Extending the same brain across the lifecycle is a *pure addition* (ADR 0012's whole point), not a migration. And a full HRM removes the last places where HR work still lives in Excel/Zalo/paper for the non-recruiting lifecycle.

---

## 2. Strategic positioning — build vs. integrate (the central decision)

The single most important product decision. See **ADR 0023** for the full rationale.

Three systems coexist. Our app is the lifecycle brain; **Fastwork** is the transactional record for time+money; the **EssilorLuxottica "personal desk"** is the corporate ESS for payslip + OKR.

| Domain | System of record | Who owns the workflow |
|---|---|---|
| **Attendance / timesheet** (chấm công) | **Fastwork** (FaceID/GPS hardware, legal record) | Fastwork captures. *We read to feed agents — **DEFERRED** until API access (§scope update).* |
| **Payroll** (tính lương) | **Fastwork** (legal record, formula engine) | Fastwork computes. *Input feed — **DEFERRED** until API access.* |
| **Payslip viewing + OKR upload (ESS)** | **EssilorLuxottica personal desk** (existing corporate portal) | Employees already do this there — **we do NOT rebuild it** |
| **Person master & employee lifecycle** | **This app** (D1) | **We own** — hire, onboard, contracts, leave decisions, offboard |
| **Org structure & positions** | **This app** (D1) | **We own** |
| **Recruiting (ATS)** | **This app** (already built) | **We own** |
| **Leave request & approval** | **This app** (agentic flow) | **We own** the decision (stands alone on D1; sync to Fastwork deferred) |
| **Asset assignment** | **This app** (onboarding/offboarding checklist) | Lightweight; Fastwork Asset integration only if Sanh later bridges |
| **OKR / KPI / performance** | manual today (via personal desk + line manager) | **OUT of v1 — leave as-is, pending BOD** (§5.10) |

**Governing rule — single writer per domain.** Each shared field has exactly one authoritative system; the others read. This kills sync loops and "which number is right" confusion. Conflict policy: **Fastwork wins time+money; the personal desk owns payslip+OKR; we win lifecycle+org+master.** For v1, since Fastwork integration is deferred, **our app is self-contained on D1** — no live cross-system writes.

**Non-negotiable guardrails (carried from the ATS):**
- **Never** touch the `matviet.com.vn` Google Workspace MX (no CF Email Routing on that zone).
- Fastwork API code is a **secret** (`wrangler secret put`), never echoed, never committed.
- PII minimized in sync logs; PDPD consent respected end-to-end.

---

## 3. Goals & success metrics

| # | Goal | Measure |
|---|---|---|
| H-G1 | Cut HR admin time per lifecycle event (onboarding, leave, contract renewal, offboarding) | Time-per-event before vs. after, per module |
| H-G2 | Make the lifecycle **propose-first** | % of lifecycle actions initiated from an agent proposal (target ≥70% of routine events) |
| H-G3 | Zero missed compliance deadlines | Probation ends, contract expiries, license renewals, BHXH windows — 0 missed |
| H-G4 | Employee self-service adoption | % of leave requests / info updates submitted by staff via app (not Zalo/paper) |
| H-G5 | Trustworthy Fastwork sync | Employee-master ↔ Fastwork mismatch rate < 1%; attendance pull freshness < 24h |
| H-G6 | One-tap trust | % of proposals approved **without edit** (proxy for agent quality) |
| H-G7 | Single source of person truth | 100% of employees resolve to one `person_id` spanning candidate→employee→alumnus |

---

## 4. Personas & devices (extends ATS personas)

| Persona | New? | Frequency | Device | JTBD | Emotional driver |
|---|---|---|---|---|---|
| **HR (chị Hương)** | grows | Daily | Laptop | From recruiter to full HR ops; run the whole lifecycle from one command feed | "Show me what needs a decision; prepare the rest" |
| **Employee / Nhân viên** | **NEW** | Weekly, bursty | **Phone** (store floor, low-tech) | Xin nghỉ phép, xem phiếu lương, xem lịch làm, cập nhật hồ sơ, đọc thông báo | "Simple as Zalo; don't make me call HR" |
| **Store / Line Manager (Trưởng cửa hàng / Trưởng phòng)** | grows | Bursty | **Phone** + laptop | Duyệt nghỉ phép, xem chấm công đội, đánh giá nhân viên, mở đề xuất tuyển | "Decide between customers, in 30 seconds" |
| **BOD / Tập đoàn** | same | Rare | Phone | Duyệt headcount, hợp đồng/lương cấp cao, chính sách | "One tap, on the way somewhere" |
| **Accountant / Payroll (Kế toán lương)** | boundary | Monthly | Fastwork | Consume payroll inputs; works *in Fastwork* | Not an in-app persona — an integration boundary |

**The big new population is ~200 employees** doing mobile self-service. ESS must be Vietnamese, thumb-first, and forgiving.

---

## 5. Functional scope — "every function of HRM"

Grouped by module. Each row notes **[BUILD]** (we own), **[INTEGRATE]** (Fastwork owns; we sync), or **[EXTEND]** (grow existing ATS code). Every BUILD module ships with its **agent(s)** (§7) and a **traditional admin UI** (§8).

### 5.1 Core HR — Hồ sơ nhân viên  **[BUILD]** (foundation exists)
- Employee master profile: person data (already in `people`), employee_code, department, position, manager, store/location, hire date, employment status, employment type.
- Vietnamese-specific fields: **CCCD/CMND**, **mã số BHXH**, **mã số thuế TNCN**, người phụ thuộc (dependents for PIT), số tài khoản ngân hàng, hộ khẩu/địa chỉ, liên hệ khẩn cấp.
- Documents (R2): hợp đồng, CCCD scan, bằng cấp, chứng chỉ — with expiry tracking.
- **Candidate → employee conversion**: hired candidate becomes an employee against the **same `person_id`** (zero migration — ADR 0012's payoff). This is the seam between the ATS and the HRM.
- Full employment history (roles, moves, salary changes) as an append-only timeline.

### 5.2 Org & positions — Phòng ban & Vị trí  **[BUILD]** (foundation exists)
- Department tree (`departments.parent_id`), position catalog (`positions`), reporting lines, per-store org.
- Headcount actual vs. plan per unit — feeds recruiting (a job req already needs Tập đoàn headcount approval).
- Org chart view; department/store rollups for analytics.

### 5.3 Recruiting / ATS — Tuyển dụng  **[EXTEND — already built]**
- The entire existing app (8-stage pipeline, AI scoring, agent proposals, approvals, offers) becomes the **Recruiting module**. `offer_accepted → hired` now triggers **onboarding** (§5.4) instead of ending the flow.
- Headcount agent (§7) can **open a req automatically** when a store is understaffed vs. plan — closing the loop from workforce planning back into hiring.

### 5.4 Onboarding — Nhận việc & Hội nhập  **[BUILD]** (partial: offer/nhan-viec token exists)
- On `hired`: agent proposes a full onboarding packet — labor-contract draft, **Fastwork account provisioning request**, equipment list, first-day schedule, buddy/mentor, mandatory policy acknowledgments, training enrollment.
- Probation plan created with the legal clock started (§5.5).
- Progress tracked as a checklist; blockers surfaced to HR feed.

### 5.5 Contracts & compliance — Hợp đồng & Tuân thủ  **[BUILD]**
- Labor-contract lifecycle: **thử việc → chính thức**, contract types per **Bộ luật Lao động 2019** (xác định thời hạn ≤ 36 tháng / không xác định thời hạn; a definite-term contract renews once then must convert to indefinite). *(Confirm current clauses with kế toán/pháp chế — labor law evolves.)*
- **Legal clocks as agent timers**: probation end (per role tier — e.g., ≤60 ngày for degree roles), contract expiry (renew 30 days out), **optical license/chứng chỉ khúc xạ** expiry, BHXH registration windows, PIT dependent-registration season.
- Compliance calendar + audit trail; every clock is an EmployeeAgent alarm (§9).

### 5.6 Time & Attendance — Chấm công  **[INTEGRATE — Fastwork owns · DEFERRED]**
- **We do not capture attendance.** Fastwork's FaceID/GPS timesheet is the record.
- The **pull** (nightly, to power the attendance-anomaly agent and validate leave) is **deferred until Fastwork API access exists** (§scope update). Until then, v1 has no attendance data and the anomaly agent is off; leave is validated against our own balances only.

### 5.7 Leave & Absence — Nghỉ phép  **[BUILD workflow · sync DEFERRED]**
- Leave request → approval as an **agentic flow**: agent checks **balance** + **team coverage** (who else is off), then proposes approve/deny with reasoning; manager one-taps. *(Attendance cross-check is added later, when the Fastwork pull lands.)*
- Leave balances per **Bộ luật Lao động 2019**: 12 ngày phép năm + 1 ngày/5 năm thâm niên; công tác, ốm, thai sản, không lương categories; Vietnamese public holidays. **Balances live in our D1** — the system of record for leave in v1.
- Pushing approved leave to Fastwork so payroll is correct is **deferred until API access**. Meanwhile leave is exported/handed to HR by the existing process; the app owns the *decision + record*, not the payroll write.

### 5.8 Payroll — Tính lương  **[INTEGRATE — Fastwork owns · DEFERRED]**
- **We never compute payroll.** Fastwork computes it; the **EssilorLuxottica personal desk** already shows employees their **payslips** — we do **not** rebuild payslip viewing.
- Feeding month-end inputs (new hires, terminations, approved leave, salary changes) to Fastwork and any "payroll readiness" agent proposal are **deferred until API access**. Until then, HR carries these across by the current process; the app just makes the inputs easy to export.

### 5.9 Benefits & Social insurance — Phúc lợi & BHXH  **[BUILD tracking + agent]**
- Track **BHXH / BHYT / BHTN** enrollment and changes; PIT dependents; company benefits.
- Compliance agent proposes filings with pre-filled data at the right windows (new hire, salary change, termination). Transactional filing may route through Fastwork/accounting — we own the *tracking + reminders*, not the government portal.

### 5.10 Performance / OKR / KPI — Đánh giá  **[OUT of v1 — leave as-is, pending BOD]**
**Decision (Sanh, 2026-09-08): do not build this in v1.** Today it is fully manual and lives outside our app:
- Employees submit objectives **agreed with their line manager**; scoring is **manual**.
- Objectives are uploaded to the **EssilorLuxottica personal desk** (OKR upload lives there).
- OKR results **only affect the year-end bonus**.
- **Known gap (future opportunity, not v1):** there is **no cross-check or verification** that the manual scoring is sound — nothing confirms a submitted score reflects real performance. A future agentic layer could verify/triangulate scoring (evidence, peer/manager consistency, distribution checks), analogous to the ATS's evidence-validated scoring — **but only after BOD confirmation**. Do not build until Sanh brings BOD sign-off.

### 5.10a Probation review (kept — it's a compliance event, not performance mgmt)
The one review v1 *does* keep is the **probation confirm/extend/end** decision — it's a legal clock (§5.5), not OKR/KPI. The ATS interview-review form is the UI template.

### 5.11 Compensation — Lương thưởng & điều chỉnh  **[BUILD tracking only · sync DEFERRED]**
- Salary-change **tracking + approval** for lifecycle events that are *not* KPI-driven: **probation pass** and contract renewal, with approval chain (manager → HR → BOD for senior). Recorded in our D1 employment history.
- **Not KPI/OKR-driven** (that's out of v1, §5.10) and **not pushed to Fastwork** until API access — the approved change is handed to payroll by the current process.

### 5.12 Learning & Development — Đào tạo  **[BUILD lightweight]**
- Training records, mandatory optical-retail certifications, a simple **skill/skill-matrix** per position (e.g., đo mắt, tư vấn tròng kính, mài lắp). Not a full LMS.
- License-expiry ties into the compliance agent (§5.5).

### 5.13 Offboarding — Nghỉ việc  **[BUILD]**
- Resignation/termination workflow: agent proposes exit checklist — asset return, **Fastwork account deactivation date**, BHXH close, final-settlement inputs to payroll, knowledge handover, exit interview.
- `person_id` retained as **alumnus** (rehire-aware; ADR 0012).

### 5.14 Employee & Manager Self-Service — ESS / MSS  **[BUILD — mobile-first, slimmed]**
Scoped to what the EssilorLuxottica personal desk does **not** already cover (payslip + OKR live on the desk — excluded here):
- **ESS (nhân viên, phone):** xin nghỉ phép, xem số dư phép, cập nhật hồ sơ (with HR approval), đọc & xác nhận chính sách, xem việc cần làm khi hội nhập, gửi đề nghị (xác nhận công tác). *(Payslip → personal desk; attendance view → deferred with the Fastwork pull.)*
- **MSS (quản lý, phone):** duyệt nghỉ phép, mở đề xuất tuyển — from the same one-tap feed. *(Team attendance view arrives with the Fastwork pull; performance review is out of v1.)*
- This is where the **new ~200-user population** lives; must be Zalo-simple.

### 5.15 HR Analytics — Báo cáo nhân sự  **[EXTEND reports]**
- Extend the existing reports module: headcount trend, turnover/attrition by store & role, tenure distribution, cost-per-hire (from ATS), leave liability, attendance trends, review completion, comp bands. PDF/Excel export (existing pipeline).

### 5.16 Internal comms & policies — Thông báo & Chính sách  **[BUILD lightweight]**
- Announcements (Fastwork News exists — integrate or own a simple feed), policy library (R2) with **acknowledgment tracking** (who read/accepted which version).

### 5.17 Assets — Tài sản  **[INTEGRATE or lightweight BUILD]**
- Onboarding/offboarding asset checklists. If Fastwork Asset is adopted, integrate; otherwise a lightweight own-table suffices for the checklist.

### 5.18 Workforce / headcount planning — Kế hoạch nhân sự  **[BUILD]**
- Annual/quarterly headcount plan per store/department; actual-vs-plan; attrition signal → headcount agent proposes opening reqs (feeds §5.3).

---

## 6. What we are **not** building (scope guards)

- **No OKR / KPI / performance management in v1** — leave the manual process as-is; revisit only with **BOD confirmation** (§5.10).
- **No payslip / payroll self-service** — the **EssilorLuxottica personal desk** already gives employees payslips + OKR upload; we don't duplicate it.
- **No payroll computation** and **no attendance capture** — Fastwork owns both (legal records + hardware).
- **Fastwork integration is DEFERRED in v1** — no API access yet (Sanh working with HR). The app is **self-contained on D1** for the basics; the sync spine (§9.1) is a later, optional phase.
- **No wholesale Fastwork replacement.** Systems coexist with strict domain boundaries; change management makes clear which app does what.
- **No full LMS** (lightweight training records only).
- **No native mobile app** — responsive web / installable PWA, persona-scoped (ESS mobile-first).
- **No multi-language** — Vietnamese only (carried from ATS).
- **No government-portal filing automation** for BHXH/PIT in v1 — we track, remind, and pre-fill; humans/accounting file.
- **No dark mode** (ADR 0022).

---

## 7. The agentic layer — the differentiator

The ATS "Hôm nay" feed generalizes into an **HR command feed** spanning every module. Every module's agent emits **fully-prepared proposals** (payload + one-line summary + "Vì sao?") to the feed; approval runs the **same server service a manual action would** (audit `via:'agent_proposal'`) — identical to ADR 0020. Autonomy is **propose-first**, widened per action type over time.

**Lifecycle agents — v1 set** (all self-contained on D1; none require Fastwork in v1):

| Agent | Trigger | Proposes | AI? |
|---|---|---|---|
| **Onboarding** | `hired` | Contract draft + equipment + first-day plan + policy acks *(Fastwork account request added when integration lands)* | mostly assembled |
| **Probation** | probation end − 7d | Confirm/extend/end decision + manager check | assembled |
| **Contract** | contract expiry − 30d | Renewal at legally-correct type + addendum draft | assembled |
| **Leave** | leave request | Approve/deny with balance + team coverage reasoning | assembled |
| **Compliance** | BHXH/PIT/license window | Filing task with pre-filled data | assembled |
| **Retention / recognition** | anniversary, birthday | Recognition or action nudge | assembled |
| **Offboarding** | resignation logged | Exit checklist + asset return + BHXH-close reminder + final-pay inputs to hand to payroll | assembled |
| **Headcount** | understaffed vs. plan / attrition | Open a recruiting req (creates ATS job draft) | AI for JD |

**Deferred agents** (arrive with Fastwork integration or BOD sign-off): *Attendance-anomaly* (needs the nightly Fastwork pull), *Payroll-readiness* (needs the Fastwork write path), and any *performance/OKR-verification* agent (needs BOD go — §5.10).

**Autonomy ladder:** low-stakes (birthday greeting, policy-ack reminder) may run auto; high-stakes (**contract, salary, termination, BHXH**) are **always** human-approved. Never auto-execute anything touching money, legal status, or an external record without a tap.

---

## 8. UX principles — traditional HRM front, hidden wires

- **Familiar surfaces:** employee list/table, org chart, leave calendar, review board, contract register — nothing exotic. A traditional HR person recognizes every screen.
- **The feed is the home:** HR and managers start at the one-tap command feed (Hôm nay), spanning all modules; the admin surfaces are for browsing/reporting, not data entry.
- **Mobile-first ESS/MSS:** thumb targets ≥40px, Vietnamese, forgiving, offline-tolerant where possible.
- **Design system:** shadcn/ui + Tailwind v3.4, navy `#0b1430` + gold `#fbc312`, light-only (ADR 0022); `src/lib/modules.ts` drives nav; new modules flip on from dark.
- **Copy:** 100% Vietnamese via `@/lib/i18n`; dates/numbers via `@/lib/vi-format`; brand via `@/lib/brand`.

---

## 9. Architecture (matches the shipped stack)

- **Same platform:** Cloudflare Workers + **D1** (Drizzle) + **R2** + **Queues** + **Cron** + **Durable Objects**; Agents SDK.
- **Person-centric core already present.** Fill in `employees`; add lifecycle tables: `contracts`, `leave_requests`, `leave_balances`, `review_cycles`, `reviews`, `onboarding_tasks`, `offboarding_tasks`, `documents`, `comp_changes`, `training_records`, `benefits`, `announcements`, `policy_acks`, and `fastwork_sync_log`. New `agent_proposals` proposal types (no new feed).
- **EmployeeAgent DO per employee** (analogous to `HiringAgent` per job): holds lifecycle timers (probation end, contract expiry, review due, license expiry, anniversary). Alarm → `SELF` binding → `/api/agent/sweep` (Bearer `CRON_SECRET`) → emits proposals. **DO holds no business logic and never reads D1** (ADR 0020 rule); losing DO state is safe — the next event re-arms.
- **Org-wide nightly cron** for cross-employee checks: Fastwork attendance pull, leave-coverage, compliance calendar, payroll-readiness. Same every-minute-drain + reconcile reliability pattern as scoring.
- **Next never imports the `agents` package** (webpack vs `cloudflare:*`) — talk to DOs via the raw stub `agent-link.ts` (ADR 0020).
- **Module registry:** flip `employees`/`org`/`leave` to `enabled: true`; add new module rows with per-role visibility; ESS/MSS routes added.

### 9.1 Fastwork integration seam (defensive) — *design for the deferred D-FW train, NOT v1*
- `src/server/integrations/fastwork/` — an adapter **interface** (`upsertEmployee`, `deactivateEmployee`, `getAttendance`, `pushLeave`, `pushSalaryChange`, `getPayslipRef`, `getKpi`…) with **two implementations**:
  - `api` — uses the permission-gated company **API code** (secret) when Fastwork confirms endpoints.
  - `csv` — manual export/import fallback (Fastwork ⇄ file), exactly like ATS TopCV **Phase A**. Chosen by a config flag, same seam pattern as `email/transport.ts`.
- **Sync model:** **push** (new hire, master change, approved leave, salary change, termination) is **queue-backed + retried**; **pull** (attendance nightly, payslip refs, optional KPI) is **cron-scheduled + reconciled**.
- **Identity mapping:** `people`/`employees` gain a `fastwork_id`; first match on CCCD/phone/email, then stable id thereafter.
- **Conflict rule:** Fastwork wins time+money; we win lifecycle+org+master. Every sync writes `fastwork_sync_log` (minimal PII) for audit + debugging.

---

## 10. Data & compliance (Vietnam)

- **PDPD** consent already modeled for candidates; extend to employees (self-service edits, data access).
- **Labor law (Bộ luật Lao động 2019):** contract types, probation caps, annual leave, notice periods — encoded as compliance-agent clocks; **confirm current clauses with kế toán/pháp chế** and re-verify on any legal update.
- **BHXH/BHYT/BHTN + PIT (thuế TNCN):** tracked with dependents; filing windows drive proposals.
- **Retention:** align with existing policy (activity logs 2y, audit forever). Employee records retained per labor-law obligations.
- **Access control:** service-layer authorization (ADR 0011); ESS scoped to self; MSS scoped to team/store; HR/admin full; BOD/Tập đoàn approval-scoped. CV/PII access rules carried from the ATS.

---

## 11. Non-functional requirements (deltas from ATS NFRs)

| ID | Requirement |
|---|---|
| H-NFR-1 | **Scale:** ~200 employees, ~5–20 stores, ~200 ESS users at bursty peaks (payday, month-end). D1 10 GB ceiling is ample; attachments in R2. |
| H-NFR-2 | **Sync freshness:** attendance pull < 24h; push (leave/hire/term) reflected before payroll close. |
| H-NFR-3 | **Mobile:** ESS/MSS pass axe on key flows; ≥40px targets; installable PWA; works on mid-range Android. |
| H-NFR-4 | **Reliability:** every Fastwork write idempotent + retried; every timer recoverable (DO loss safe). |
| H-NFR-5 | **Security:** Fastwork API code + all secrets via `wrangler secret`; sync logs data-minimized; never touch Google MX zone. |
| H-NFR-6 | **Vietnamese-only**, WCAG 2.1 AA, `prefers-reduced-motion`, light-only — carried from ATS. |

---

## 12. Roadmap — dependency-ordered build groups

Reordered for the 2026-09-08 scope: **HRM basics first, standalone on D1**; Fastwork and performance are pulled out of the critical path. Each group is an **agentic module** with its own ADR + build group.

**v1 — HRM basics (buildable now, no Fastwork, no BOD dependency):**

| Phase | Name | Delivers | Key risk retired |
|---|---|---|---|
| **H0** | **HRIS foundation activation** | Flip on employees/org; candidate→employee conversion; employee profile; org chart; person dedup | Proves the ATS↔HRM seam on the existing foundation |
| **H1** | **Onboarding + Contracts + Compliance clocks** | EmployeeAgent DO; probation/contract/license/BHXH timers; onboarding packet proposals (D1-only) | Legal clocks — the highest-value agentic win |
| **H2** | **Leave + ESS/MSS (mobile)** | Leave request/approval agent; VN leave balances in D1; slim mobile self-service (leave, info update, policy-ack, onboarding tasks) | The ~200-user adoption bet |
| **H3** | **Offboarding + Analytics + Comms + Docs** | Exit workflow; HR analytics; announcements + policy library w/ acks; document store | Full basic lifecycle closed |

**Deferred trains (need an external unlock — do NOT start without it):**

| Phase | Name | Blocked on |
|---|---|---|
| **D-FW** | **Fastwork integration spine** (attendance pull → payroll input feed → account provisioning) | Sanh + HR obtaining the company **API code** (or a decision to run the CSV bridge) |
| **D-PERF** | **Performance / OKR verification** | **BOD confirmation** (§5.10) — today's manual, unverified scoring is left as-is |
| **D-AUTO** | **Autonomy widening + ESS depth** | Trust earned from v1 usage |

**No Fastwork discovery gate blocks v1 anymore** — H0–H3 are entirely self-contained on D1. The Fastwork discovery task simply unlocks **D-FW** whenever Sanh + HR are ready.

---

## 13. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Fastwork API undocumented / closed** | Medium *(was High — de-risked by deferral)* | v1 doesn't depend on Fastwork at all (self-contained on D1); integration is the separate **D-FW** train, unlocked when Sanh + HR get the API code (or choose the CSV bridge) |
| **Three-system confusion** (us / Fastwork / EssilorLuxottica desk) | High | Strict **single-writer-per-domain**; clear boundaries (we = lifecycle+org+master; Fastwork = time+money; desk = payslip+OKR); staff comms on "which app does what" |
| **Scope explosion** (HRM is vast) | High | v1 = HRM basics only (H0–H3); performance/OKR + Fastwork pulled out; agent-per-module; foundation already laid; scope guards in §6 |
| **Adoption by ~200 low-tech staff** | Medium-High | Zalo-simple mobile ESS; propose-first keeps HR load low; Vietnamese-only; training + `/huong-dan` visual guide |
| **Labor-law / BHXH / PIT compliance error** | High | Compliance agent + audit; clauses confirmed with kế toán/pháp chế; re-verify on legal updates |
| **Change management (two apps)** | Medium | Clear domain boundaries; staff comms on "which app does what"; ESS is the single door for employees |
| **PII exposure via sync** | Medium | Data-minimized sync logs; secrets discipline; PDPD consent extended to employees |

---

## 14. Open questions

**Resolved 2026-09-08 (Sanh):**
- ~~Fastwork API access~~ → **deferred**; Sanh working with HR. v1 is self-contained on D1.
- ~~Leave & KPI ownership~~ → **OKR/KPI out of v1** (leave as-is, pending BOD). Leave workflow is ours, in D1.
- ~~ESS scope~~ → **no payslip/OKR** in our ESS (EssilorLuxottica personal desk owns those); v1 ESS = leave + info update + policy-ack + onboarding tasks.

**Still open (do not block v1 — H0–H3 proceed regardless):**
1. **Personal desk boundary:** is the EssilorLuxottica "personal desk" a separate system from Fastwork? Does it also hold the official **employee master** (global HRIS), which would make our employee record a *local operational* copy rather than the master?
2. **Store/location model:** are stores `departments`, a separate `locations` table, or a department × store matrix?
3. **Leave today:** who approves leave now and where is it recorded — so our v1 leave module slots into the real process (and what HR needs exported for payroll)?
4. **Later:** BOD stance on performance/OKR verification (unlocks D-PERF); Fastwork API vs CSV bridge decision (unlocks D-FW).

---

## 15. References

- ATS PRD: `docs/PRD.md` (v3.0) — becomes the Recruiting module
- Foundation: `docs/decisions/0012-employee-management-foundation.md`
- Agent architecture: `docs/decisions/0020-agent-driven-hiring.md`
- **This PRD's strategic decision:** `docs/decisions/0023-hrm-system-of-engagement-over-fastwork.md`
- Architecture / schema: `docs/architecture.md`; module registry `app/src/lib/modules.ts`; schema `app/src/db/schema.ts`
- Fastwork HRM+ (feature reference): https://fastwork.vn/fastwork-hrm/ · API: https://fastwork.vn/fastwork-api/
- Design system: `docs/ui-ux.md`, `app/.claude/CLAUDE.md`, ADR 0022
