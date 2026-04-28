# Infrastructure & Assets Checklist

**Purpose:** Actionable checklist for Sanh + IT + DNS + designer to prepare prerequisites before each build group.

**Owner key:** `[Sanh]` `[IT]` `[DNS]` `[Designer]` `[Claude]` (via MCP)

---

## ✅ Completed

- [x] **[Sanh]** Supabase organization signup + billing
- [x] **[Sanh]** Supabase project created — `Mắt Việt HR application`, ref `xeyqbapegqeibeqrwnkm`, region `ap-southeast-2` (Sydney), Postgres 17.6.1.111, ACTIVE_HEALTHY
- [x] **[Sanh]** Personal Access Token generated and pasted into `.mcp.json`
- [x] **[Sanh]** Project-scope MCP `supabase-matviet` connected and verified
- [x] **[Designer]** Logo files delivered: MV1-MV6.png in `app/public/brand/` (eye glyph with heart-shaped iris; navy + yellow brand colors; PNG; SVG deferred to v2)
- [x] **[Claude]** Content drafts approved: `docs/content/email-templates.md`, `docs/content/scoring-rubrics.md`, `docs/content/ui-strings.md`. chị Hương final spot-check during staging review.
- [x] **[Claude]** Doc structure split per §0.10: CLAUDE.md, README.md, docs/{PRD, architecture, ui-ux, integrations, api, infra-checklist, runbook, privacy-notice-vi, build-log, branch-log}.md + 8 ADRs + content/ + samples/

---

## Group 0 — Prerequisites (must be live before Group 1)

### Repo & local tooling — [Sanh]
- [ ] `git init` in project root + first commit (Word docs included; tilde lock files excluded via `.gitignore`)
- [ ] Create GitHub private repo `matviet-hr`; push initial commit
- [ ] Install Node 20 LTS, npm/pnpm, Supabase CLI, Netlify CLI, Fly CLI, GitHub CLI
- [ ] Create Netlify account; connect GitHub repo; create `matviet-hr` site

### Domain & DNS — [Sanh ↔ DNS admin]
- [ ] Subdomain `hr.matviet.com.vn` → CNAME to `matviet-hr.netlify.app`
- [ ] Subdomain `hr-staging.matviet.com.vn` → CNAME to branch deploy URL
- [ ] Verify HTTPS active in Netlify

### Brand assets — [Designer]
- [x] **Logo PNG variants delivered (MV1-MV6 in `app/public/brand/`)** — see `app/public/brand/README.md` for use-case mapping
- [ ] `favicon.ico` (multi-size 16/32/48) — generated from MV2 by Sharp script during Group 1
- [ ] `apple-touch-icon.png` (180×180) — generated during Group 1
- [ ] `og-image.png` (1200×630) — composed at build time during Group 1
- [ ] 5 empty-state illustrations: `empty-{candidates,jobs,pipeline,notifications,search}.svg` (line art, primary-300 accent) — designer to deliver during Group 2
- [ ] `email-header.png` (600×120 for React Email templates) — derived from MV2 during Group 6
- [ ] (v2) SVG versions of logos for crisp scaling — vectorize PNGs or commission designer

### Supabase Pro plan upgrade — [Sanh ↔ Claude]
- [ ] **[Claude]** `mcp__supabase-matviet__get_cost(type='subscription_change')` → present to Sanh
- [ ] **[Sanh]** Confirm upgrade to Pro ($25/mo) for PITR + 100GB Storage
- [ ] **[Claude]** `mcp__supabase-matviet__confirm_cost(...)` then upgrade applied

---

## Group 3 — AI scoring prerequisites

### Gemini API — [Sanh]
- [ ] Create Google Cloud project (e.g., `matviet-hr-ai`)
- [ ] Enable **Generative Language API** at https://console.cloud.google.com
- [ ] Generate API key → restrict to HTTP referrers `*.matviet.com.vn/*`, `*.netlify.app/*`
- [ ] **Enable billing** (paid tier — required per ADR-0006)
- [ ] Test 1 API call to confirm; paste `GEMINI_API_KEY` into `.env.local` and Netlify env

### LibreOffice DOCX worker — [Sanh]
- [ ] Sign up Fly.io
- [ ] Run `fly launch` once with `Dockerfile` from `libreoffice-worker/`
- [ ] Set `LIBREOFFICE_WORKER_SECRET` env on Fly + locally (random 32-char)
- [ ] Note `LIBREOFFICE_WORKER_URL` (e.g., `https://matviet-docx.fly.dev`)
- [ ] Smoke test: upload a sample DOCX → expect PDF back

---

## Group 4 — Email infrastructure prerequisites (CRITICAL — start ticket Day 1)

### Shared mailbox — [IT]
- [ ] Verify `hr@matviet.com.vn` exists as a shared mailbox in Exchange Online
- [ ] If not, create shared mailbox (no extra license)
- [ ] Create subfolder `Hiring/Processed` for poller to move processed messages

### Azure AD app registration — [IT]
- [ ] Open https://entra.microsoft.com → App registrations → New registration
  - Name: `Mat Viet HR Automation`
  - Single tenant
  - No redirect URI (daemon)
- [ ] Note `Application (client) ID` and `Directory (tenant) ID` → send to Sanh
- [ ] API permissions → Microsoft Graph → **Application** permissions:
  - `Mail.Send`
  - `Mail.Read`
  - `Mail.ReadWrite`
  - `Calendars.ReadWrite`
  - `MailboxSettings.Read`
- [ ] **Grant admin consent** for tenant
- [ ] Certificates & secrets → New client secret (24mo expiry); copy value (one-time)
- [ ] Send `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` to Sanh via secure channel (1Password share)

### Application Access Policy — [IT, runs PowerShell]
```powershell
Connect-ExchangeOnline -UserPrincipalName <admin>@matviet.com.vn

New-ApplicationAccessPolicy `
  -AppId "<application-client-id>" `
  -PolicyScopeGroupId hr@matviet.com.vn `
  -AccessRight RestrictAccess `
  -Description "Restrict Mat Viet HR app to hr mailbox only"

# Wait ~1 hour for propagation, then:
Test-ApplicationAccessPolicy -Identity hr@matviet.com.vn -AppId "<app-id>"
# Expected: AccessCheckResult = Granted

Test-ApplicationAccessPolicy -Identity otheruser@matviet.com.vn -AppId "<app-id>"
# Expected: AccessCheckResult = Denied
```
- [ ] Both tests pass

### DNS — SPF/DKIM/DMARC — [DNS admin]

- [ ] **SPF** TXT on `matviet.com.vn`:
  ```
  v=spf1 include:spf.protection.outlook.com -all
  ```
- [ ] **DKIM** — Exchange admin center → Mail flow → DKIM → enable on `matviet.com.vn`:
  - Add 2 CNAME records Microsoft generates:
    - `selector1._domainkey` → `selector1-matviet-com-vn._domainkey.<tenant>.onmicrosoft.com`
    - `selector2._domainkey` → `selector2-matviet-com-vn._domainkey.<tenant>.onmicrosoft.com`
  - After CNAMEs propagate, click **Enable** in Exchange
- [ ] **DMARC** TXT on `_dmarc.matviet.com.vn`:
  ```
  v=DMARC1; p=quarantine; rua=mailto:dmarc@matviet.com.vn; ruf=mailto:dmarc@matviet.com.vn; fo=1
  ```
  - Start with `p=quarantine`; promote to `p=reject` after 2-4 weeks of clean reports
- [ ] Verify all three at https://mxtoolbox.com → `matviet.com.vn` → SPF / DKIM / DMARC = Pass
- [ ] Send test from hr@matviet.com.vn to gmail.com / yahoo.com / outlook.com → all arrive in Inbox (not Junk)
- [ ] Score ≥ 9/10 at https://www.mail-tester.com

---

## Group 8 — Source integrations prerequisites

### TopCV — [Sanh]
- [ ] Confirm Mắt Việt has TopCV employer package active (~3M VND / 6 months)
- [ ] Export sample CSV from TopCV employer dashboard → save to `docs/samples/topcv-export-sample.csv`
- [ ] (Phase B) Contact TopCV support to request API credentials:
  - Email: hotro@topcv.vn or via employer.topcv.vn dashboard
  - Ask for: API documentation URL, OAuth2 client ID/secret OR API key/secret, webhook format docs, sandbox environment, rate limits
- [ ] Set up Outlook auto-forwarding rule on chị Hương's mailbox: TopCV emails → forward to hr@matviet.com.vn

### CareerViet — [Sanh]
- [ ] Export sample CSV from CareerViet employer dashboard → save to `docs/samples/careerviet-export-sample.csv`

---

## Pre-launch verification (Group 11)

### Technical
- [ ] Production deploy at `hr.matviet.com.vn` returns 200
- [ ] SSL certificate valid (Let's Encrypt via Netlify)
- [ ] All env vars set on Netlify production context
- [ ] All migrations applied (verify `mcp__supabase-matviet__list_migrations`)
- [ ] All RLS policies active (verify `mcp__supabase-matviet__get_advisors(type='security')` clean)
- [ ] Sentry catching errors (test: trigger a test error, verify in Sentry)
- [ ] Better Stack uptime monitor active
- [ ] All scheduled functions running (Netlify Cron logs)

### Integrations
- [ ] `/api/health` returns `{db: 'ok', graph: 'ok', gemini: 'ok', libreoffice: 'ok'}`
- [ ] `/api/settings/integrations/graph/ping` succeeds
- [ ] `/api/settings/integrations/gemini/ping` succeeds
- [ ] LibreOffice worker reachable
- [ ] Inbox polling active — forward 1 test email, confirm candidate created

### Content
- [ ] Logo + favicon + OG image deployed
- [ ] All empty-state illustrations in place
- [ ] Vietnamese fonts loading (check Network tab)
- [ ] All UI strings reviewed by chị Hương (`docs/content/ui-strings.md` marked Approved)
- [ ] All 7 email templates reviewed by chị Hương (`docs/content/email-templates.md` marked Approved)
- [ ] Scoring rubrics reviewed by HR + Trưởng phòng each role family (`docs/content/scoring-rubrics.md` marked Approved)
- [ ] Privacy notice reviewed and published (`docs/privacy-notice-vi.md` marked Approved)

### Access
- [ ] 3 production users created (admin Sanh, hr_staff Hương, hiring_manager test)
- [ ] RLS verified cross-role (manager doesn't see other dept's candidates)
- [ ] Password reset flow works
- [ ] Admin can invite new users

### Data
- [ ] Weight templates seeded (4 role families)
- [ ] Email templates seeded (7 templates)
- [ ] Departments seeded from Mắt Việt org chart
- [ ] 1 test job created and walked through full pipeline

### Human
- [ ] 2 training sessions delivered to chị Hương (2-3h each)
- [ ] Chị Hương completes 1 real hire on staging
- [ ] 1 Trưởng phòng tested manager flow
- [ ] User guide PDF (`docs/user-guide-vi.pdf`) approved
- [ ] Support channel agreed (Zalo / WhatsApp / email) — Sanh primary 1 month post-launch

---

## Cost summary

### One-time
| Item | Cost (VND) |
|---|---|
| Supabase Pro setup | 0 (monthly) |
| Netlify, Fly.io, Sentry, Better Stack | 0 (free tiers) |
| Logo + assets (if outsourced) | 2-5M |
| **Total** | **2-5M** |

### Monthly recurring
| Service | USD | VND |
|---|---|---|
| Supabase Pro | $25 | ~625,000 |
| Fly.io worker | $5 | ~125,000 |
| Gemini API | ~$0.10 | ~2,500 |
| Sentry | $0 | 0 |
| Better Stack | $0 | 0 |
| MS Graph | $0 (in O365) | 0 |
| Netlify | $0 | 0 |
| Custom domain | $1 | ~25,000 |
| **Total** | **~$31** | **~775,000** |
| TopCV employer (existing) | — | ~500,000 |

Cost guardrails: $5/day soft alert, $25/day hard cap on Gemini.

---

## Contact & escalation

| Role | Person | Channel |
|---|---|---|
| Project owner / dev | Sanh Võ | (chat / email) |
| HR lead | chị Bùi Thị Hương | (in person / email) |
| Mắt Việt IT | TBD | (Sanh confirms before Group 4) |
| DNS admin | TBD | (Sanh confirms before Group 4) |
| Designer | TBD | (Sanh confirms before Group 1) |
| TopCV vendor | TopCV support | hotro@topcv.vn |
| BOD (mgmt approvals) | TBD | (Sanh confirms when first mgmt hire occurs) |
