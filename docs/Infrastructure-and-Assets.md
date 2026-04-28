# Infrastructure & Assets Checklist
## Mắt Việt HR — Chuẩn bị hạ tầng và tài nguyên trước khi build

| Phiên bản | 1.0 |
|---|---|
| Ngày | 21/04/2026 |
| Mục đích | Actionable checklist để Sanh + IT Mắt Việt + designer chuẩn bị đầy đủ trước khi dev chính thức ramp-up |
| Cách dùng | Đánh dấu `[x]` khi hoàn thành. Bất kỳ mục nào **marked BLOCKER** phải xong trước Group tương ứng. |

---

## 0. Tổng Quan & Timeline Chuẩn Bị

**Trước khi dev start (Group 0):** mọi mục trong Section 1 (Sanh) phải xong.  
**Trước Group 4 (Email):** Section 2 (IT Mắt Việt) và Section 3 (DNS) phải xong — đây là blockers nghiêm trọng nhất.  
**Trước Group 3 (AI Scoring):** Section 5 (Gemini + LibreOffice) phải xong.  
**Trước launch (Group 11):** Section 8 (Legal & Docs) phải xong.

Critical path: **IT → DNS → MS Graph integration**. Bắt đầu ticket Mắt Việt IT **ngay hôm nay**; thường mất 3-5 ngày làm việc đến 2 tuần tùy quy trình công ty.

---

## 1. Do Sanh Chuẩn Bị (tự làm được)

### 1.1 Supabase Project — BLOCKER Group 1
- [ ] Tạo tổ chức Supabase tại [supabase.com](https://supabase.com) (đăng ký bằng email `matvietdesignteam@gmail.com` hoặc email công ty)
- [ ] Tạo project mới:
  - Name: `matviet-hr-prod`
  - Region: **Southeast Asia (Singapore)** — latency thấp nhất với VN
  - Plan: **Pro ($25/tháng)** — cần PITR, storage 100GB, 100K MAUs
  - Database password: dùng 1Password hoặc Bitwarden lưu 32 ký tự random
- [ ] (Optional) Tạo thêm project `matviet-hr-staging` Free tier để test
- [ ] Lấy và lưu vào secure vault (1Password/Bitwarden):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only, nguy hiểm — không share)
  - `SUPABASE_DB_URL` (Connection string)
- [ ] Enable PITR (backups mỗi 2 phút, retain 7 ngày)
- [ ] Verify billing active, payment method valid

### 1.2 GitHub Repository
- [ ] Tạo repo private `matviet-hr` trên GitHub (tài khoản Sanh hoặc org nếu có)
- [ ] Initialize local: `cd "E:\NEW APP\HR imrovement\Mắt Việt HR" && git init`
- [ ] `.gitignore`: Node, .env, build artifacts, `~$*` (Word lock files)
- [ ] Branch strategy: `main` = production, `develop` = staging, feature branches
- [ ] Protected branch rules: `main` require PR review + CI pass

### 1.3 Netlify — BLOCKER Group 1
- [ ] Signup [netlify.com](https://app.netlify.com) (link GitHub)
- [ ] Tạo site `matviet-hr`
  - Connect to GitHub repo (deploy preview per PR)
  - Build command: `npm run build`
  - Publish directory: `.next`
  - Framework: Next.js (auto-detected)
- [ ] Install plugins:
  - `@netlify/plugin-nextjs` (auto)
  - `@netlify/plugin-scheduled-functions` cho cron
- [ ] Configure env vars trong UI (tất cả env vars từ `.env.example`)
- [ ] Set build contexts:
  - Production = `main` branch → hr.matviet.com.vn
  - Branch deploy = `develop` → hr-staging.matviet.com.vn
  - Deploy previews = all PRs

### 1.4 Domain & DNS — Một phần Sanh làm
- [ ] Xác định ai quản lý `matviet.com.vn` domain (thường là IT)
- [ ] Request thêm subdomain:
  - `hr.matviet.com.vn` — production
  - `hr-staging.matviet.com.vn` — staging
- [ ] CNAME records cho Netlify:
  - `hr CNAME matviet-hr.netlify.app`
  - `hr-staging CNAME matviet-hr-branch-develop.netlify.app`
- [ ] Enable Netlify's HTTPS (Let's Encrypt auto-provision)
- [ ] Verify cert active (xanh ở Netlify UI)

### 1.5 Gemini API — BLOCKER Group 3
- [ ] Tạo Google Cloud project tại [console.cloud.google.com](https://console.cloud.google.com)
  - Project ID suggestion: `matviet-hr-ai`
- [ ] Enable **Generative Language API** (hoặc Vertex AI nếu cần enterprise quota)
- [ ] Create API key (APIs & Services → Credentials → Create API Key)
- [ ] Restrict API key:
  - HTTP referrers: `*.matviet.com.vn/*`, `*.netlify.app/*`
  - API restrictions: Generative Language API only
- [ ] Enable billing trên Google Cloud (thêm payment method)
- [ ] Request quota 1000 RPM cho `gemini-2.5-flash` (mặc định đủ nhưng request để chắc chắn)
- [ ] Test 1 API call với tiny prompt để confirm hoạt động
- [ ] Lưu `GEMINI_API_KEY` vào 1Password

### 1.6 Sentry — Monitoring
- [ ] Signup [sentry.io](https://sentry.io) (free tier, 5K events/tháng đủ)
- [ ] Tạo project `matviet-hr` kiểu Next.js
- [ ] Lấy `SENTRY_DSN` lưu vào vault
- [ ] Setup release tracking (`sentry-cli` trong CI)

### 1.7 Better Stack (Uptime + Logs) — Optional
- [ ] Signup [betterstack.com](https://betterstack.com) (free tier)
- [ ] Add monitor cho `hr.matviet.com.vn` (3 phút interval)
- [ ] Slack/Email notification khi down

### 1.8 LibreOffice DOCX→PDF Worker — BLOCKER Group 3
- [ ] Signup Fly.io (preferred, có free tier) hoặc Railway.app
- [ ] Deploy tiny container:
  ```dockerfile
  FROM debian:bookworm-slim
  RUN apt-get update && apt-get install -y \
      libreoffice-core libreoffice-writer curl nodejs npm \
      && apt-get clean && rm -rf /var/lib/apt/lists/*
  WORKDIR /app
  COPY package.json server.js ./
  RUN npm install
  EXPOSE 8080
  CMD ["node", "server.js"]
  ```
- [ ] Express server expose `POST /convert` (multipart file upload → run `libreoffice --headless --convert-to pdf` → return PDF)
- [ ] Secure với shared secret header `X-Worker-Secret`
- [ ] Lưu: `LIBREOFFICE_WORKER_URL`, `LIBREOFFICE_WORKER_SECRET`
- [ ] Test: upload 1 DOCX file → nhận PDF về

### 1.9 Development Environment — Sanh local
- [ ] Node.js 20 LTS installed
- [ ] pnpm hoặc npm latest
- [ ] Supabase CLI: `npm install -g supabase`
- [ ] Netlify CLI: `npm install -g netlify-cli`
- [ ] Fly CLI: `curl -L https://fly.io/install.sh | sh`
- [ ] GitHub CLI: `gh` installed
- [ ] VS Code với extensions: Tailwind IntelliSense, Prisma (nếu dùng), ESLint, Prettier, GitLens
- [ ] Vietnamese language pack trong OS (nếu chưa)

---

## 2. Do IT Mắt Việt Chuẩn Bị (Sanh mở ticket)

### 2.1 Shared Mailbox — BLOCKER Group 4
- [ ] Verify `hr@matviet.com.vn` exists như shared mailbox trong Exchange Online
  - Nếu chưa: tạo shared mailbox (không tốn license)
  - Nếu đang là personal mailbox: convert sang shared mailbox
  - Alternative nếu không được: tạo mới `hr-hiring@matviet.com.vn`
- [ ] Tạo subfolder `Hiring/Processed` trong inbox để poller move processed messages
- [ ] Chị Hương có quyền read/send từ mailbox này (trước đây đã có)

### 2.2 Azure AD App Registration — BLOCKER Group 4

Hướng dẫn cho IT, open [entra.microsoft.com](https://entra.microsoft.com):

- [ ] **App registrations → New registration:**
  - Name: `Mat Viet HR Automation`
  - Supported account types: `Single tenant`
  - Redirect URI: để trống (daemon app)
- [ ] Sau khi tạo, copy:
  - `Application (client) ID` → gửi Sanh
  - `Directory (tenant) ID` → gửi Sanh
- [ ] **API permissions → Add permission → Microsoft Graph → Application permissions:**
  - `Mail.Send`
  - `Mail.Read`
  - `Mail.ReadWrite`
  - `Calendars.ReadWrite`
  - `MailboxSettings.Read`
- [ ] **Grant admin consent** cho tenant (nút xanh "Grant admin consent for [organization]")
- [ ] **Certificates & secrets → New client secret:**
  - Description: `Mat Viet HR App Secret - Issued YYYY-MM-DD`
  - Expires: **24 months** (đặt reminder renew)
  - Copy secret **VALUE** (chỉ hiện 1 lần!) → gửi Sanh qua secure channel (1Password share hoặc encrypted)
  - **Better alternative:** use certificate instead of secret (no expiry headache)

### 2.3 Application Access Policy — BLOCKER Group 4

IT chạy trong **Exchange Online PowerShell** (từ máy có module `ExchangeOnlineManagement`):

```powershell
# 1. Connect
Connect-ExchangeOnline -UserPrincipalName <admin>@matviet.com.vn

# 2. Tạo policy restrict app chỉ truy cập hr@matviet.com.vn
New-ApplicationAccessPolicy `
  -AppId "<application-client-id-from-2.2>" `
  -PolicyScopeGroupId hr@matviet.com.vn `
  -AccessRight RestrictAccess `
  -Description "Restrict Mat Viet HR app to hr mailbox only"

# 3. Test policy (QUAN TRỌNG — phải chờ ~1 giờ sau mới propagate)
Test-ApplicationAccessPolicy -Identity hr@matviet.com.vn -AppId "<app-id>"
# Expected: AccessCheckResult = Granted

Test-ApplicationAccessPolicy -Identity otheruser@matviet.com.vn -AppId "<app-id>"
# Expected: AccessCheckResult = Denied
```

- [ ] Policy chạy thành công
- [ ] Test grant/deny đúng kỳ vọng
- [ ] Document policy ID và gửi Sanh để tham khảo

### 2.4 Handover cho Sanh
- [ ] IT gửi Sanh các giá trị (qua 1Password share hoặc encrypted channel):
  - `MS_TENANT_ID`
  - `MS_CLIENT_ID`
  - `MS_CLIENT_SECRET` (hoặc certificate file + passphrase)
  - Confirmation: shared mailbox + policy applied

---

## 3. Do DNS Admin Chuẩn Bị (có thể là IT Mắt Việt hoặc vendor)

### 3.1 SPF Record — BLOCKER Group 4
- [ ] Kiểm tra record hiện tại trên `matviet.com.vn`: `dig TXT matviet.com.vn +short`
- [ ] Nếu chưa có Microsoft, thêm TXT record:
  ```
  v=spf1 include:spf.protection.outlook.com -all
  ```
- [ ] Nếu có include khác (Google Workspace cũ, etc.), merge cẩn thận — max 10 DNS lookups
- [ ] Verify: [mxtoolbox.com/spf.aspx](https://mxtoolbox.com/spf.aspx) → matviet.com.vn → phải pass

### 3.2 DKIM — BLOCKER Group 4
Trong Exchange Admin Center ([admin.exchange.microsoft.com](https://admin.exchange.microsoft.com)):

- [ ] Navigate to **Mail flow → DKIM**
- [ ] Select `matviet.com.vn` → **Enable DKIM signing**
- [ ] Microsoft sẽ yêu cầu thêm 2 CNAME records vào DNS:
  - `selector1._domainkey.matviet.com.vn CNAME selector1-matviet-com-vn._domainkey.<tenant>.onmicrosoft.com`
  - `selector2._domainkey.matviet.com.vn CNAME selector2-matviet-com-vn._domainkey.<tenant>.onmicrosoft.com`
- [ ] Sau khi CNAMEs propagate (~1h), click Enable trong Exchange
- [ ] Verify: [mxtoolbox.com/dkim.aspx](https://mxtoolbox.com/dkim.aspx) → matviet.com.vn với selector `selector1`

### 3.3 DMARC — BLOCKER Group 4
- [ ] Thêm TXT record trên `_dmarc.matviet.com.vn`:
  ```
  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@matviet.com.vn; ruf=mailto:dmarc-reports@matviet.com.vn; fo=1; adkim=s; aspf=s
  ```
  - Start với `p=quarantine` (junk folder) — không phải `p=reject` ngay để tránh hard fail
  - Sau 2-4 tuần nếu không có false positive, đổi sang `p=reject`
- [ ] Tạo `dmarc-reports@matviet.com.vn` mailbox hoặc distribution list để nhận báo cáo
- [ ] Verify: [mxtoolbox.com/dmarc.aspx](https://mxtoolbox.com/dmarc.aspx)

### 3.4 Subdomains (làm cùng 1.4)
- [ ] CNAME `hr.matviet.com.vn` → `matviet-hr.netlify.app`
- [ ] CNAME `hr-staging.matviet.com.vn` → preview deploy URL

### 3.5 Deliverability Smoke Test
- [ ] Trước Group 11 launch, Sanh test gửi email từ `hr@matviet.com.vn`:
  - Đến 1 địa chỉ Gmail ngoài
  - Đến 1 địa chỉ Yahoo
  - Đến 1 địa chỉ Outlook.com
  - Đến 1 địa chỉ Zalo email (nếu có)
- [ ] Tất cả phải vào **Inbox** (không Junk/Spam)
- [ ] Check email header: SPF=pass, DKIM=pass, DMARC=pass

---

## 4. Do Designer Chuẩn Bị (Sanh tự làm hoặc thuê freelance)

### 4.1 Logo — BLOCKER Group 1

**Brief:** "Mắt Việt HR" (tiếng Việt = "Vietnamese Eye HR"). Concept: precision + clarity + Vietnamese warmth. Medical/optical clean aesthetic. Không quá futuristic (user là HR VN truyền thống).

- [ ] **Logo lockup primary** — wordmark + glyph
  - File: `logo-primary.svg` + PNG 200×48
  - Màu chủ đạo: optical blue `#2563EB`
  - Font wordmark: Be Vietnam Pro Bold
  - Glyph: stylized eye với iris hình học (có thể ẩn hình chữ V hoặc lotus petal)
- [ ] **Logo white** (for dark navigation)
  - File: `logo-white.svg`
  - Toàn bộ trắng, cùng shape
- [ ] **Logo monochrome** (for reports/print)
  - File: `logo-mono.svg`
  - Đen 100%
- [ ] **Glyph-only** (for favicon, app icon, avatar)
  - File: `logo-glyph.svg`
  - Square canvas 512×512
  - Phải readable ở 16×16

### 4.2 Favicons & Icons — BLOCKER Group 1
- [ ] `favicon.ico` — 16×16, 32×32, 48×48 multi-size
- [ ] `apple-touch-icon.png` — 180×180 PNG
- [ ] `icon-192.png`, `icon-512.png` — PWA icons (dù chưa là PWA, ready for future)

### 4.3 OG Image (Social Sharing) — BLOCKER Group 1
- [ ] `og-image.png` — 1200×630 PNG
- [ ] Nội dung: logo + "Mắt Việt HR — Hệ thống quản lý tuyển dụng thông minh" + brand accents
- [ ] Saved to `public/og-image.png`

### 4.4 Empty State Illustrations — BLOCKER Group 1

Line art style, `#93C5FD` accent, `#64748B` base. SVG preferred.

- [ ] `empty-candidates.svg` — briefcase + magnifier, "Chưa có ứng viên"
- [ ] `empty-jobs.svg` — empty document with "+" icon, "Chưa có tin tuyển dụng"
- [ ] `empty-pipeline.svg` — kanban board placeholder, "Pipeline trống"
- [ ] `empty-notifications.svg` — bell with z's, "Không có thông báo mới"
- [ ] `empty-search.svg` — magnifier với "?", "Không tìm thấy kết quả"

### 4.5 Email Header Image
- [ ] `email-header.png` — 600×120 PNG
- [ ] Logo đơn giản hóa trên background `#1E40AF` (primary-800)
- [ ] Hosted tại Netlify CDN hoặc Supabase Storage public bucket
- [ ] Reference trong email HTML templates

### 4.6 Font Files
- [ ] Download [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) weights 400, 500, 600, 700
  - woff2 format
  - Vietnamese subset only (giảm payload)
  - Save to `public/fonts/`
- [ ] Download [JetBrains Mono](https://www.jetbrains.com/lp/mono/) weights 400, 500
  - Chỉ cần Latin subset cho code/IDs

### 4.7 Design Tokens Review
- [ ] Designer review color palette đã định (§7 plan) — có thống nhất với Mắt Việt brand master không?
- [ ] Designer approve typography scale
- [ ] Designer approve spacing grid 8px

---

## 5. Do Sanh Làm Tiếp (sau khi 2, 3, 4 xong)

### 5.1 Integration với Secrets
- [ ] Sau khi IT gửi MS credentials, lưu vào Netlify env vars + local .env.local
- [ ] Test MS Graph auth bằng script test: `src/scripts/test-graph-auth.ts`
- [ ] Test gửi email test: "Test Graph API email" đến cá nhân Sanh → arrive inbox
- [ ] Test đọc inbox: list messages, confirm có permission

### 5.2 Deliverability Verification
Trước khi launch Group 4 production code:
- [ ] [mxtoolbox.com/SuperTool.aspx](https://mxtoolbox.com/SuperTool.aspx) → matviet.com.vn:
  - SPF Check: PASS
  - DKIM: PASS selector1 + selector2
  - DMARC: PASS
- [ ] [mail-tester.com](https://www.mail-tester.com) → gửi test email → score ≥ 9/10

### 5.3 Supabase Local Dev
- [ ] `supabase init` trong repo
- [ ] Link to remote project: `supabase link --project-ref <ref>`
- [ ] Chạy migrations 0001-0007: `supabase db push`
- [ ] Verify tables, RLS, triggers trong Supabase Studio
- [ ] Seed default data: weight templates, email templates, 1 default department

---

## 6. TopCV (Phase B — Sau Launch)

### 6.1 TopCV Account & API Credentials
- [ ] Xác nhận Mắt Việt đã có TopCV employer package active (~3M/6 tháng)
- [ ] Contact TopCV support/sales:
  - Email: hotro@topcv.vn hoặc qua dashboard employer.topcv.vn
  - Hỏi: "Gói employer package có bao gồm API access không? Nếu có, làm thế nào để lấy credentials?"
  - Request:
    - API documentation URL
    - OAuth2 client ID + secret (hoặc API key + secret key)
    - Webhook format documentation
    - Sandbox environment
    - Rate limits
- [ ] Nếu TopCV cấp: lưu vào vault, plan integration cho Phase B
- [ ] Nếu không cấp: continue Phase A (CSV + email forwarding) làm workaround

### 6.2 Outlook Forwarding Rule (for Phase A)
- [ ] Trong Outlook của HR, tạo rule:
  - If sender domain = `topcv.vn` OR contains "TopCV"
  - Forward to `hr@matviet.com.vn`
  - Keep copy in inbox
- [ ] Hoặc nếu TopCV notifications gửi đến mailbox khác: forward rule tại mailbox đó
- [ ] Test: đăng 1 tin TopCV → ứng viên test ứng tuyển → confirm email forward đến hr@

---

## 7. Tài Liệu & Legal

### 7.1 User Guide Tiếng Việt — BLOCKER Launch
- [ ] `docs/user-guide-vi.pdf` ~10 trang
  - Đăng nhập
  - Đăng tin tuyển dụng
  - Nhập CV (các nguồn)
  - Xem điểm AI và đánh giá
  - Lên lịch phỏng vấn
  - Điền form đánh giá (cho Trưởng phòng)
  - Phê duyệt
  - Xuất báo cáo
  - Troubleshooting thường gặp
- [ ] Screenshots tiếng Việt
- [ ] Tác giả: Sanh
- [ ] Review: chị Hương trước khi final

### 7.2 Runbook Vận Hành — BLOCKER Launch
- [ ] `docs/runbook.md`
  - Cách rotate Azure AD secret khi sắp expire (24 tháng)
  - Cách regenerate Supabase service role key
  - Cách restore database từ PITR
  - Cách re-deploy LibreOffice worker
  - Cách handle Gemini quota hit (circuit breaker logic)
  - Contact escalation: IT, designer, TopCV vendor
  - On-call rotation (Sanh làm sole oncall ít nhất 1 tháng sau launch)

### 7.3 Legal & Privacy
- [ ] `docs/privacy-notice.md` — dữ liệu ứng viên xử lý thế nào
  - CV lưu trữ tại Supabase Singapore
  - AI analysis qua Google Gemini (Vietnamese CV content gửi đến Google server)
  - Retention: CV giữ 2 năm theo luật lao động VN, sau đó xóa
  - User rights: request data export, request deletion
- [ ] Review với legal/admin (nếu có)
- [ ] Nếu ship candidate portal v2: cần consent flow explicit

### 7.4 Training Materials
- [ ] Slide deck training (2 buổi × 2-3h)
  - Buổi 1: Overview + quản lý tin + nhập CV + AI scoring
  - Buổi 2: Phỏng vấn + email + phê duyệt + báo cáo
- [ ] Video screen record walk-through (15-20 phút) — archive cho future HR

---

## 8. Environment Variables — Single Source of Truth

Copy `.env.example`:

```bash
# Supabase (1.1)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # SERVER ONLY

# Microsoft Graph (2.2, 2.3)
MS_TENANT_ID=xxxx-xxxx-xxxx-xxxx
MS_CLIENT_ID=xxxx-xxxx-xxxx-xxxx
MS_CLIENT_SECRET=xxxxx
MS_MAILBOX_ADDRESS=hr@matviet.com.vn
MS_TIMEZONE=SE Asia Standard Time

# Gemini (1.5)
GEMINI_API_KEY=AIzaSy...

# LibreOffice Worker (1.8)
LIBREOFFICE_WORKER_URL=https://matviet-docx.fly.dev
LIBREOFFICE_WORKER_SECRET=<32-char-random>

# Cron Protection
CRON_SECRET=<32-char-random>

# App
NEXT_PUBLIC_APP_URL=https://hr.matviet.com.vn
NEXT_PUBLIC_APP_NAME=Mắt Việt HR

# Monitoring (1.6)
SENTRY_DSN=https://...@sentry.io/...
```

**Nơi lưu:**
- Local dev: `.env.local` (KHÔNG commit)
- Production: Netlify UI → Site settings → Environment variables
- Staging: Netlify branch-specific env
- Backup: 1Password vault "Mắt Việt HR — Secrets"

---

## 9. Cost Summary — Chi Phí Khởi Tạo và Vận Hành

### 9.1 Chi phí khởi tạo (one-time)
| Item | Chi phí | Ghi chú |
|---|---|---|
| Supabase Pro setup | 0 | Trả theo tháng |
| Netlify setup | 0 | Free tier, trả nếu cần team |
| Fly.io LibreOffice worker | 0 | Free allowance đủ |
| Domain subdomain | 0 | Dùng domain có sẵn |
| Azure AD app | 0 | Miễn phí (có trong O365) |
| Logo + assets (thuê freelance) | **2-5M VND** | Nếu tự design thì 0 |
| **Tổng khởi tạo** | **2-5M VND** | |

### 9.2 Chi phí hàng tháng
| Dịch vụ | USD | VND | Ghi chú |
|---|---|---|---|
| Supabase Pro | $25 | ~625.000 | Bắt buộc (PITR, storage) |
| Fly.io worker | $5 | ~125.000 | Tiny container 256MB |
| Gemini API | ~$0.10 | ~2.500 | 50-150 CV/tháng |
| Sentry | $0 | 0 | Free tier đủ |
| Better Stack | $0 | 0 | Free tier đủ |
| MS Graph | $0 | 0 | Đã có O365 license |
| Netlify | $0 | 0 | Free tier đủ |
| Custom domain | $1 | ~25.000 | $12/năm |
| **Tổng tháng** | **~$31** | **~775.000** | |
| TopCV (không mới) | — | ~500.000 | 3M/6 tháng = 500K/tháng, chi phí tuyển đã có |

### 9.3 Budget backup cho sự cố
- Dự phòng 1-2M/tháng đầu cho:
  - Vượt quota Gemini nếu scoring nhiều hơn dự kiến
  - Upgrade Fly.io nếu worker cần nhiều RAM
  - Trusted SSL nếu Let's Encrypt có sự cố

---

## 10. Pre-Launch Verification Checklist

Trước khi flip DNS và go-live, verify HẾT:

### 10.1 Technical
- [ ] Production deploy ở `hr.matviet.com.vn` serve 200 OK
- [ ] SSL certificate valid
- [ ] All env vars set on Netlify production context
- [ ] Database migrations applied (verify trong Supabase Studio)
- [ ] RLS policies active tất cả tables
- [ ] Sentry catching errors (trigger test error, verify Sentry receive)
- [ ] Better Stack monitoring active
- [ ] Cron scheduled functions chạy đúng interval

### 10.2 Integrations
- [ ] MS Graph auth success — `/api/settings/integrations/graph/ping` returns OK
- [ ] Gemini test — `/api/settings/integrations/gemini/ping` returns OK
- [ ] LibreOffice worker reachable — test convert 1 DOCX
- [ ] Inbox polling active — forward 1 test email, confirm candidate created
- [ ] Deliverability test — gửi email đến 3 providers, all inbox

### 10.3 Content
- [ ] Logo + favicon + OG image deployed
- [ ] All empty states có illustration
- [ ] Font loading working (check Network tab)
- [ ] Vietnamese copy không có typo (review chị Hương)
- [ ] Email templates preview render đúng
- [ ] User guide PDF accessible trong app

### 10.4 Access
- [ ] 3 test users (admin, hr, manager) created
- [ ] RLS verified cross-role (manager không thấy jobs khác department)
- [ ] Password reset flow hoạt động
- [ ] Admin có thể invite user mới

### 10.5 Data
- [ ] Weight templates 4 role families seeded
- [ ] Email templates 7 defaults seeded
- [ ] Departments initial list seeded (list từ Mắt Việt)
- [ ] 1 test job được tạo và có thể đi qua full pipeline

### 10.6 Human
- [ ] 2 buổi training chị Hương hoàn thành
- [ ] Chị Hương đã test full workflow trên staging (1 job thật)
- [ ] Trưởng phòng một bộ phận đã test manager flow
- [ ] Support process agreed (Slack channel / WhatsApp / Zalo)
- [ ] On-call schedule (Sanh primary 1 tháng sau launch)

---

## 11. Contact & Escalation

| Vai trò | Người | Kênh liên hệ |
|---|---|---|
| Project Owner / Developer | Sanh Võ | (điền) |
| HR Lead / User chính | Chị Bùi Thị Hương | (điền) |
| IT Mắt Việt | (cần Sanh xác nhận) | (điền) |
| DNS Admin | (cần Sanh xác nhận) | (điền) |
| Designer | (Sanh hoặc freelance) | (điền) |
| TopCV vendor | Sales TopCV | hotro@topcv.vn |
| BOD (approve management hires) | (cần Sanh xác nhận) | (điền) |

---

## 12. Timeline Recommendation

**Nếu start ticket IT hôm nay (21/04/2026):**

| Tuần | Target |
|---|---|
| Tuần 1 (21-27/04) | - Sanh: Supabase + Netlify + Gemini + Fly.io setup<br>- Ticket IT: shared mailbox + Azure AD app + Application Access Policy<br>- Ticket DNS: SPF + DKIM + DMARC<br>- Designer: logo brief + 4 variants |
| Tuần 2 (28/04 - 04/05) | - IT hoàn thành Azure AD + policy (5-7 ngày làm việc)<br>- DNS hoàn thành DKIM (cần 24h propagate)<br>- Designer deliver logos + illustrations<br>- Sanh: start dev Group 1 với foundation |
| Tuần 3+ | Dev ramp-up theo build order trong `mutable-crunching-coral.md` |

**Critical path:** IT + DNS là slowest — không start được Group 4 (Email Infrastructure) nếu chưa xong. Tranh thủ 2 tuần đầu Sanh làm foundation + core (Group 1-3) song song với IT tickets.

---

**— End of Infrastructure & Assets Checklist —**

*Nếu có câu hỏi về item nào, comment trực tiếp trong file hoặc ping Sanh.*
