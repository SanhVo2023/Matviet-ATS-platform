# Integrations — Mắt Việt HR

> **⚠️ TÀI LIỆU CŨ (pre-pivot).** Phần lớn nội dung mô tả stack Supabase/Netlify/Gemini đã bị thay thế bởi Cloudflare (ADR 0009–0013) và CSV import đã bị xóa (ADR 0017). Nguồn đúng hiện tại: docs/decisions/ + CLAUDE.md + src/server/<module>/README.md.


Master plan reference: PART V

---

## 1. Google Gemini AI

### 1.1 Model & SDK
- **Model:** `gemini-2.5-flash`
- **SDK:** `@google/genai` (unified)
- **Env:** `GEMINI_API_KEY`
- **Tier: PAID** (`ai.google.dev` with billing enabled). Per Google's Gemini API Terms (paid tier), inputs/outputs are **NOT used to train models**, no human review, retention per published windows. ADR-0006.

### 1.2 Architecture: decoupled per-criterion scoring

**Core principle:** store RAW per-criterion scores; apply weights at query time. Changing weights does NOT trigger Gemini re-runs. ADR-0004.

```
┌─ Upload CV ─┐    ┌─ Parse pass ─┐    ┌─ Score pass ─┐    ┌─ Validate ─┐
│  PDF/DOCX   │──▶ │  Gemini      │──▶ │  Gemini      │──▶ │  Fuzzy     │──▶ Persist:
│  buffer     │    │  → JSON      │    │  → 6 raw     │    │  match     │    candidates.cv_parsed
└─────────────┘    │  cv_parsed   │    │  scores +    │    │  evidence  │    ai_screenings.scores
                   └──────────────┘    │  evidence    │    │  vs CV     │
                                       └──────────────┘    └────────────┘

At query time: weighted_total = Σ (scores[k].score × jobs.weights[k])
```

### 1.3 Re-scoring matrix

| Trigger | Re-call Gemini? | Reason |
|---|---|---|
| HR changes weights on a job | NO | Aggregate at query time using new weights |
| HR uploads new CV | YES | New input → new parse + score |
| Job's `criteria_config.keywords` change | YES (score pass only, parse cached) | Rubric content shifted |
| Gemini model upgraded | YES (admin sweep button) | Calibration drift |
| Re-running for audit | YES | Compare new vs cached |

### 1.4 Pass 1 — Parse CV (`src/lib/ai/gemini/parse-cv.ts`)

Input: PDF buffer (native — no pre-extraction). DOCX: convert via LibreOffice worker first.

Prompt (Vietnamese-first):
```
Bạn là chuyên gia phân tích CV. Trích xuất thông tin có cấu trúc từ CV đính kèm.

Yêu cầu:
- Trả về JSON theo schema được cung cấp.
- Giữ nguyên tiếng Việt cho tên riêng, địa điểm, tên công ty.
- Với kỹ năng: liệt kê thành các cụm từ ngắn (≤ 3 từ).
- Với kinh nghiệm: sắp xếp theo thời gian giảm dần (mới nhất trước).
- Nếu không tìm thấy thông tin nào đó, để null (không đoán).
- Ngôn ngữ CV có thể là tiếng Việt, tiếng Anh, hoặc hỗn hợp.
```

`responseSchema` (abridged):
```json
{
  "type": "object",
  "properties": {
    "personal": { "full_name", "email", "phone", "location", "date_of_birth" },
    "experience": [{ "company", "title", "start_date", "end_date", "is_current", "description", "industry" }],
    "education": [...],
    "skills": ["string"],
    "languages": [...],
    "certifications": [...],
    "total_years_experience": "number"
  },
  "required": ["personal", "experience", "education", "skills"]
}
```

Validation: Zod schema mirroring above; chronology check; required-field presence. Failure → mark `ai_screening_status='failed'` + activity log + retry available.

### 1.5 Pass 2 — Score CV (`src/lib/ai/gemini/score-cv.ts`)

Input: parsed CV JSON + job + per-criterion config + keyword hints.

Prompt:
```
Bạn là chuyên gia tuyển dụng cho công ty Mắt Việt (chuỗi cửa hàng mắt kính).
Chấm điểm ứng viên dưới đây cho vị trí: {{job_title}}.

Hãy chấm từ 0-100 cho MỖI tiêu chí và trích dẫn BẰNG CHỨNG cụ thể từ CV.

Tiêu chí:
1. industry_fit       — Phù hợp ngành nghề. Từ khóa: {{criteria_config.industry_fit.keywords}}
2. professional_skills — Kỹ năng chuyên môn. Yêu cầu: {{job.requirements_excerpt}}
3. work_experience    — Chất lượng và sự liên quan của công việc trước đây.
4. years_experience   — Số năm phù hợp (yêu cầu: {{job.min_years}} năm).
5. education          — Trình độ học vấn phù hợp.
6. location           — Địa điểm làm việc (ưu tiên: {{job.location}}).

Mỗi tiêu chí: { score 0-100, reasoning (1-2 câu tiếng Việt), evidence_quotes (1-3 trích nguyên văn từ CV) }

CV ứng viên:
{{parsed_cv_json}}
```

`responseSchema`:
```json
{
  "per_criterion": {
    "industry_fit":        { "score": 0-100, "reasoning": "...", "evidence_quotes": [...] },
    "professional_skills": { ... },
    "work_experience":     { ... },
    "years_experience":    { ... },
    "education":           { ... },
    "location":            { ... }
  },
  "overall_summary": "..."
}
```

### 1.6 Evidence validation (`src/server/scoring/evidence.ts`)

LLMs hallucinate citations 30-94%. Fuzzy-match each `evidence_quote` against `cv_raw_text`:

```typescript
import { compareTwoStrings } from 'string-similarity'

function validateEvidence(perCriterion, cvRawText) {
  const sentences = cvRawText.split(/(?<=[.!?])\s+/)
  return Object.fromEntries(
    Object.entries(perCriterion).map(([k, v]) => {
      const verifiedQuotes = v.evidence_quotes.map(q => {
        if (cvRawText.includes(q)) return { text: q, verified: true }
        const best = sentences
          .map(s => ({ s, score: compareTwoStrings(q.toLowerCase(), s.toLowerCase()) }))
          .sort((a,b) => b.score - a.score)[0]
        if (best?.score >= 0.95) return { text: best.s, verified: true }
        return { text: q, verified: false }
      })
      return [k, { ...v, evidence_quotes: verifiedQuotes }]
    })
  )
}
```

UI: verified = green check; unverified = amber warning + "Trích dẫn không khớp với CV. Cần kiểm tra thủ công." Doesn't block scoring.

### 1.7 Async pipeline (`src/server/scoring/pipeline.ts`)

```typescript
async function enqueueScoring(candidateId) {
  await db.scoring_queue.insert({ candidate_id: candidateId, status: 'pending' })
  await db.candidates.update(candidateId, { stage: 'screening' })
  // Edge function picks up via LISTEN/NOTIFY or scheduled poll
}

async function processScoringJob(candidateId) {
  const candidate = await getCandidate(candidateId)
  const job = await getJob(candidate.job_id)

  try {
    let pdfBuffer = await downloadFromStorage(candidate.cv_file_path)
    if (candidate.cv_file_path.endsWith('.docx')) {
      pdfBuffer = await libreoffice.convert(pdfBuffer)
      const newPath = candidate.cv_file_path.replace(/\.docx$/, '.pdf')
      await uploadToStorage(newPath, pdfBuffer)
      await updateCandidate(candidateId, { cv_file_path: newPath })
    }

    const parsed = await gemini.parseCv(pdfBuffer)
    const scored = await gemini.scoreCv(parsed, job)
    const validated = validateEvidence(scored.per_criterion, parsed._raw_text)

    await db.ai_screenings.insert({
      candidate_id: candidateId,
      model: 'gemini-2.5-flash',
      parse_response: parsed,
      score_response: scored,
      scores: validated,                 // RAW source-of-truth
      tokens_in, tokens_out, cost_usd
    })

    const weighted = computeWeightedTotal(validated, job.weights)
    await db.candidates.update(candidateId, {
      ai_score: weighted,                // denormalized for list sort
      ai_scored_at: new Date(),
      stage: 'screened',
      cv_raw_text: parsed._raw_text,
      cv_parsed: parsed
    })

    await stageHooks.fire(candidateId, 'new', 'screened')   // → receipt_ack email
    await notifications.push(hrUserId, { type: 'cv_scored', candidateId })
  } catch (err) {
    await handleScoringFailure(candidateId, err)
  }
}
```

### 1.8 Failure handling

| Error class | Behavior | UI |
|---|---|---|
| `rate_limit` (429) | Backoff 5s/15s/45s → re-queue with delay 5min | Stage `screening`; spinner "Đang chờ AI" |
| `quota_exhausted` | Circuit-break Gemini for 1h; queue holds; admin alert | Banner: "AI tạm dừng — tiếp tục sau 1 giờ" |
| `invalid_pdf` | `ai_screening_status='failed'` + reason in activity_logs; stage stays `new` | Red badge "Cần review thủ công" + "Thử lại" + manual scoring sliders |
| `schema_validation` | Retry once with stricter prompt; else same as invalid_pdf | Same |
| `libreoffice_failed` | Mark failed, reason "Không chuyển đổi được DOCX" | Same with link to original file |

`candidates.ai_screening_status` enum: `pending` | `running` | `success` | `failed`. Manual scoring writes `ai_screenings` row with `model='manual'` + HR user_id.

### 1.9 Cost
`cost_usd = (tokens_in × 0.30 + tokens_out × 2.50) / 1_000_000`. Dashboard shows monthly total. Batch API (`/batches`) used for bulk re-scoring sweeps (50% discount). Guardrails: $5/day soft alert, $25/day hard cap.

---

## 2. Microsoft Graph (Email + Calendar)

### 2.1 Auth
- **App-only daemon flow** (client credentials)
- **MSAL Node** `ConfidentialClientApplication` — tenant + client ID + client secret (or certificate in prod)
- **`ApplicationAccessPolicy`** restricts the AAD app to `hr@matviet.com.vn` only
- **Scopes:** `Mail.Send`, `Mail.Read`, `Mail.ReadWrite`, `Calendars.ReadWrite`, `MailboxSettings.Read`

### 2.2 Email functions (`src/lib/graph/email.ts`)

- `sendMail({to, cc?, subject, bodyHtml, attachments?, replyToMessageId?})` → POST `/users/hr@matviet.com.vn/sendMail`
  - With `replyToMessageId`: uses `/reply` endpoint for threading
- `listInbox({since, unreadOnly=true, hasAttachments=true})` — `$filter=isRead eq false and hasAttachments eq true and receivedDateTime ge {iso}`
- `getAttachment(messageId, attachmentId)` — base64 in response
- `markRead(messageId)` — PATCH with `{isRead: true}`
- `moveToFolder(messageId, folderName)` — POST `/move`
- `getConversation(conversationId)` — for thread view

Token refresh on 401; dead-letter queue table `email_failures` for non-retryable. `MailProvider` interface seam for testing.

### 2.3 Inbox poller (`/api/graph/mail/poll`)

Scheduled via Netlify Cron `*/5 * * * *`:

```typescript
async function pollInbox() {
  const since = await getLastPollTime()
  const messages = await graph.listInbox({ since, unreadOnly: true, hasAttachments: true })

  for (const msg of messages) {
    if (await db.email_logs.existsBy({ graph_message_id: msg.id, direction: 'inbound' })) continue
    await db.email_logs.insert({ ..., direction: 'inbound', status: 'received' })

    const attachments = await graph.listAttachments(msg.id)
    const cvAtts = attachments.filter(a => /\.(pdf|docx)$/i.test(a.name))
    if (cvAtts.length === 0) { await graph.markRead(msg.id); continue }

    const source = classifySource(msg.sender)
    const jobId = await matchJob(msg.subject, msg.body)

    for (const att of cvAtts) {
      const bytes = await graph.getAttachment(msg.id, att.id)
      const storagePath = `unassigned/${crypto.randomUUID()}-${att.name}`
      await supabase.storage.from('cvs').upload(storagePath, bytes)
      const candidate = await db.candidates.insert({
        job_id: jobId ?? UNASSIGNED_JOB_ID,
        full_name: extractNameFromEmail(msg) ?? att.name.replace(/\.(pdf|docx)$/i,''),
        email: msg.sender,
        source: 'email_inbox',
        source_meta: { graph_message_id: msg.id, filename: att.name },
        cv_file_path: storagePath,
        stage: 'new'
      })
      await scoringQueue.enqueue(candidate.id)
    }

    await graph.markRead(msg.id)
    await graph.moveToFolder(msg.id, 'Hiring/Processed')
  }
  await setLastPollTime(new Date())
}
```

Idempotency: `email_logs` UNIQUE INDEX on `graph_message_id WHERE direction='inbound'`.

### 2.4 Deliverability (non-negotiable)
Required on `matviet.com.vn` BEFORE Group 6:
- **SPF:** `v=spf1 include:spf.protection.outlook.com -all`
- **DKIM:** enabled in Exchange admin center, both selectors (selector1 + selector2)
- **DMARC:** `v=DMARC1; p=quarantine; rua=mailto:dmarc@matviet.com.vn`

Verified via mxtoolbox.com. Test send to gmail/yahoo/outlook all inbox.

### 2.5 Calendar (`src/lib/graph/calendar.ts`)

- `createInterviewEvent({start, end, subject, body, attendees, location?, teamsLink=true})` → `{eventId, joinUrl?}`
  - POST `/users/hr@matviet.com.vn/events` with `isOnlineMeeting: true` + `onlineMeetingProvider: 'teamsForBusiness'`
  - Returns `event.id` and `event.onlineMeeting.joinUrl`
- `cancelEvent(eventId, note?)` → POST `/events/{id}/cancel`
- `rescheduleEvent(eventId, newStart, newEnd)` → PATCH `/events/{id}`
- `getEvent(eventId)` → fetch attendee responses

Outlook calendar = source of truth. We mirror in `interviews.graph_event_id`. If edited in Outlook, sync on next fetch.

---

## 3. TopCV / CareerViet

### 3.1 Phase A (v1, ships first)

**CSV import** — `src/lib/integrations/topcv/csv-parser.ts` and `careerviet/csv-parser.ts`. Employer-exported CSVs. Map columns → `IngestedCandidate` interface. UI: `/jobs/[id]` → "Nhập CV" → upload → preview rows → confirm.

**Email forwarding** — `src/lib/integrations/topcv/email-parser.ts`. HR sets up Outlook rule auto-forwarding TopCV notification emails to `hr@matviet.com.vn`. Parser detects TopCV sender pattern, extracts candidate name from subject, downloads attached CV.

### 3.2 Phase B (post-launch)

**TopCV API** — `src/lib/integrations/topcv/api-client.ts`. OAuth2 flow per Base.vn pattern (access token + secret key). Endpoints from TopCV: list applications for a job post, get candidate detail, download CV. Webhook receiver at `/api/webhooks/topcv` — TopCV pushes new applications.

Both Phase A and B implement `CandidateSource` interface — caller code unchanged.

### 3.3 Sample CSV format

See `docs/samples/topcv-export-sample.csv` and `careerviet-export-sample.csv` (placeholders until Sanh provides real exports).

---

## 4. LibreOffice DOCX → PDF worker

Deployed to Fly.io (small container, ~256MB RAM). Sanh runs `fly launch` once.

`Dockerfile`:
```
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

`server.js` — Express endpoint `POST /convert`:
- Multipart upload of DOCX
- Runs `libreoffice --headless --convert-to pdf --outdir /tmp <file>`
- Returns PDF bytes
- Auth via shared header `X-Worker-Secret` matching `LIBREOFFICE_WORKER_SECRET`

Client wrapper at `src/lib/libreoffice/convert.ts` — `convert(docxBuffer): Promise<Buffer>`. Used only by scoring pipeline when CV uploaded as DOCX.

Fallback: reject DOCX upload with "Vui lòng convert sang PDF" if worker is down.

---

## 5. Notifications (Realtime + email digest)

See `docs/architecture.md` §3.2 for `notifications` table schema.

- **In-session:** Supabase Realtime subscription on `notifications` filtered by `user_id = auth.uid()`. Bell icon + unread count.
- **Off-hours digest:** scheduled function at 8am UTC+7 reads all unread notifications + today's interviews + pending approvals → single summary email per user via MS Graph.
- **Immediate emails:** interview tomorrow, interview in 1h, approval request, candidate reply.

Mapping table: `docs/architecture.md` or master plan §0.14.

---

## 6. Cross-references

- ADR-0002 — MS Graph chosen over Resend
- ADR-0004 — Decoupled scoring architecture
- ADR-0006 — Paid Gemini API tier
- ADR-0007 — No File Search / pgvector for v1
- API endpoints calling these: `docs/api.md`
