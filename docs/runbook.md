# Operational Runbook — Mắt Việt HR

Procedures for ops events. Owner: Sanh Võ (primary on-call 1 month post-launch).

---

## 1. Secret rotation

### Supabase Personal Access Token (in `.mcp.json`)
1. Generate new PAT at https://supabase.com/dashboard/account/tokens (name: `MatViet HR — Claude Code MCP — YYYY-MM-DD`)
2. Edit `.mcp.json` → replace token in `args` array
3. Quit and re-launch Claude Code from project directory
4. Verify: ask Claude to `mcp__supabase-matviet__list_organizations` — should still show Sanh's org
5. Revoke old token at https://supabase.com/dashboard/account/tokens

### Microsoft Graph client secret
1. Open https://entra.microsoft.com → App registrations → `Mat Viet HR Automation` → Certificates & secrets
2. Add new client secret (24mo); copy value (one-time)
3. Update `MS_CLIENT_SECRET` in:
   - `.env.local`
   - Netlify env (production + preview contexts)
4. Trigger Netlify redeploy of main
5. Verify: `GET /api/settings/integrations/graph/ping` returns 200
6. Delete old secret in Azure portal
7. Set calendar reminder: "Rotate MS_CLIENT_SECRET" 22 months from new secret's creation

### Gemini API key
1. Generate new key at Google Cloud Console → APIs & Services → Credentials
2. Update `GEMINI_API_KEY` in `.env.local` + Netlify env
3. Verify: `GET /api/settings/integrations/gemini/ping` returns 200 + cost
4. Revoke old key

### Supabase service role key
**Highly sensitive — server-only.** Rotate only on suspected compromise.
1. Reset at Supabase Studio → Settings → API → "Reset service role key"
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Netlify env
3. Redeploy
4. **Note:** active edge functions using the key will fail until redeployed; expect 1-5min downtime on cron jobs

### LibreOffice worker secret
1. Generate new 32-char random
2. Update on Fly.io: `fly secrets set LIBREOFFICE_WORKER_SECRET=<new>`
3. Update Netlify env: `LIBREOFFICE_WORKER_SECRET=<new>`
4. Redeploy Netlify

---

## 2. Database recovery

### Restore from PITR (Point-in-Time Recovery)
**Available only on Pro plan, 7-day retention, 2-min RPO.**

1. Open Supabase Studio → Database → Backups
2. Select target time
3. Confirm restore (overwrites current state — destructive!)
4. **Always create DB branch first** for safety:
   ```
   mcp__supabase-matviet__create_branch(name='restore-test-YYYY-MM-DD')
   ```
   Test restore on the branch; verify data; only then merge to main if needed.

### Manual backup before risky migration
```
mcp__supabase-matviet__create_branch(name='migration-test-<group>')
# apply migration on branch
# smoke queries via execute_sql
# OK? mcp__supabase-matviet__merge_branch
# Bad? mcp__supabase-matviet__delete_branch
```

Log every branch in `docs/branch-log.md`.

---

## 3. Scoring queue stuck

### Symptom
HR reports "CV uploaded an hour ago, still says 'Đang chấm'"

### Diagnose
```
mcp__supabase-matviet__execute_sql(query="
  SELECT id, candidate_id, status, attempts, last_error, enqueued_at, started_at
  FROM scoring_queue
  WHERE status IN ('queued', 'running', 'failed')
  ORDER BY enqueued_at DESC LIMIT 20;
")
```

### Common causes & fixes

| Cause | Diagnosis | Fix |
|---|---|---|
| Gemini quota hit | `last_error` includes `quota_exhausted` | Wait until midnight UTC+7 reset OR upgrade Gemini quota |
| Cron stopped | `started_at` IS NULL on multiple jobs | Check Netlify Functions → `scoring-queue-process` logs; redeploy if stuck |
| LibreOffice down | `last_error` mentions "libreoffice" | Check `fly status -a matviet-docx`; `fly deploy` if needed |
| Schema drift | `last_error` mentions Zod validation | Check Sentry; recent CV format may need parser update |

### Manual unstick
```
mcp__supabase-matviet__execute_sql(query="
  UPDATE scoring_queue
  SET status = 'queued', next_retry_at = NULL, attempts = 0
  WHERE status = 'failed' AND last_error LIKE '%transient%';
")
```

---

## 4. Email not delivering to candidates

### Symptom
Candidate didn't receive interview invite (verified via candidate complaint or email_logs.status = 'sent' but no reply ever)

### Diagnose
1. Check `email_logs` for the candidate's recent sends:
   ```
   mcp__supabase-matviet__execute_sql(query="
     SELECT id, to_address, subject, status, error, sent_at, graph_message_id
     FROM email_logs
     WHERE candidate_id = '<id>' AND direction = 'outbound'
     ORDER BY created_at DESC;
   ")
   ```
2. Verify deliverability at https://mxtoolbox.com → matviet.com.vn — SPF/DKIM/DMARC all pass
3. Send test from Supabase Studio: `/api/settings/integrations/graph/ping`
4. Test send to gmail / yahoo / outlook addresses; check spam folders

### Common causes
- DKIM record removed / expired → re-publish in DNS
- DMARC policy too strict for Microsoft IPs → temporary `p=none` while debugging
- Sender mailbox over quota → IT clears
- Attachment too large → check `email_logs.error`; reduce attachment

---

## 5. Database branch sprawl cleanup

### Run weekly
```
mcp__supabase-matviet__list_branches(project_id='xeyqbapegqeibeqrwnkm')
```

For each branch:
- If merged > 7 days ago → `delete_branch(branch_id)`
- If unmerged > 7 days → ping the PR owner; consider `delete_branch` if abandoned
- Update `docs/branch-log.md` with disposition

---

## 6. Cost guardrail tripped

### Soft alert ($5/day Gemini)
- Email arrives at Sanh's address
- Check `cost_meters` table: which day, which feature drove cost
- Usually: bulk re-score sweep from admin button. Reduce frequency OR move to batch API (50% off)
- No action needed unless trending up

### Hard cap ($25/day Gemini)
- Circuit breaker engaged automatically
- In-app banner: "AI tạm dừng — tiếp tục sau {{reset_time}}"
- HR can still upload CVs; scoring queues but doesn't process until reset
- If legitimate usage: temporarily raise cap by editing `cost_meters` config
- Investigate via `ai_screenings` for last 24h — abnormal token counts? Loop?

---

## 7. New user onboarding

### HR or Manager invite
1. Login as admin → `/settings/users` → Invite
2. Enter email + role + department
3. System sends Supabase magic link signup email
4. User clicks link → sets password
5. `profiles` row auto-created via trigger
6. User logs in to role-appropriate landing page

### Deactivating a user
- `/settings/users` → toggle `is_active=false`
- Active sessions invalidated within 1 minute
- Their assigned candidates / interviews remain; reassignable by admin

---

## 8. Production deploy

### Standard flow (PR-based)
1. Create feature branch from `main`
2. Commit changes; push to GitHub
3. Open PR; Netlify auto-creates preview at `<branch>--matviet-hr.netlify.app`
4. Run skills: `/simplify`, `/review`, `/security-review` (if RLS/auth/email/upload touched)
5. Merge to `main` → Netlify deploys production
6. **Monitor `mcp__supabase-matviet__get_logs` for 5 minutes** — paste tail status into PR

### Rollback
- Netlify: Deploys → previous deploy → "Publish deploy"
- Supabase migration rollback: ONLY if migration designed reversible. Otherwise restore from PITR.

### Hotfix
- Branch from `main` → `hotfix/<short-name>`
- Minimal change + commit
- Skip `feature-dev` skill but still run `/review` and `/security-review`
- Emergency merge with single review

---

## 9. Logs & monitoring

### Supabase logs (via MCP)
```
mcp__supabase-matviet__get_logs(service='postgres')      # SQL errors
mcp__supabase-matviet__get_logs(service='auth')          # login attempts, RLS denials
mcp__supabase-matviet__get_logs(service='storage')       # upload errors
mcp__supabase-matviet__get_logs(service='edge-function') # custom function logs
mcp__supabase-matviet__get_logs(service='realtime')      # subscription health
```

### Sentry
https://sentry.io/organizations/matviet-hr → Issues
- Critical → page Sanh
- High → email
- Medium/Low → review weekly

### Better Stack
https://betterstack.com → Uptime monitor on `hr.matviet.com.vn`. 3-min interval. Slack/email on down > 5min.

### Activity log
Admin → `/admin/audit` for human-readable mutation history.

---

## 10. Common queries

### Top candidates this month
```sql
SELECT c.full_name, c.email, c.ai_score, j.title
FROM candidates c JOIN jobs j ON j.id = c.job_id
WHERE c.created_at >= now() - interval '30 days'
  AND c.deleted_at IS NULL
ORDER BY c.ai_score DESC NULLS LAST
LIMIT 20;
```

### Candidates stuck in stage > N days
```sql
SELECT c.full_name, c.stage, c.last_stage_changed_at,
       (now() - c.last_stage_changed_at) AS time_in_stage
FROM candidates c
WHERE c.deleted_at IS NULL
  AND c.last_stage_changed_at < now() - interval '7 days'
  AND c.stage NOT IN ('hired','rejected','withdrawn')
ORDER BY c.last_stage_changed_at;
```

### Source effectiveness this quarter
```sql
SELECT source,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE stage = 'hired') AS hired,
       ROUND(100.0 * COUNT(*) FILTER (WHERE stage = 'hired') / COUNT(*), 1) AS hire_rate_pct
FROM candidates
WHERE created_at >= date_trunc('quarter', now())
GROUP BY source
ORDER BY total DESC;
```

---

## 11. Escalation contacts

| Issue | First contact | Escalation |
|---|---|---|
| Production down | Sanh Võ | Mắt Việt IT (if Office 365 / DNS) |
| RLS policy bug | Sanh | (no escalation; fix in code) |
| Data deletion request (candidate GDPR-style) | chị Hương | Sanh applies; documented per privacy notice |
| MS Graph access denied | IT (Application Access Policy) | Microsoft 365 admin |
| Gemini quota | Google Cloud billing | (no escalation) |
| TopCV API issue | TopCV vendor (hotro@topcv.vn) | (no escalation) |
| BOD approval flow stuck | chị Hương → BOD admin | Tập đoàn admin |

---

## 12. Periodic maintenance

### Daily
- (auto) Cost meters check at 00:00 UTC+7
- (auto) Maintenance cleanup at 01:00 UTC+7

### Weekly
- Review Supabase advisors: `mcp__supabase-matviet__get_advisors(type='security')` and `(type='performance')`
- Review database branch list; clean up merged > 7d
- Review Sentry digest

### Monthly
- Verify deliverability at mxtoolbox + mail-tester (regression check)
- Review activity_logs row count; partition if > 100K
- Review Gemini cost trend
- User survey: "Any pain points this month?"

### Quarterly
- Rotate any non-expiring secrets prophylactically
- Review unused users; deactivate
- Review unused jobs; close
- Annual: rotate MS Graph client secret before 24mo expiry

---

# Cloudflare operations (post-pivot, ADR 0009 — supersedes Supabase/Netlify sections above)

## Deploy
```bash
cd app && npm run deploy          # opennextjs build + wrangler deploy
npx wrangler tail matviet-hr      # watch logs 5 min post-deploy
```

## Rollback a bad deploy
```bash
npx wrangler deployments list
npx wrangler rollback             # reverts to previous deployment
```

## Restore data (replaces Supabase PITR)
```bash
npx wrangler d1 time-travel info matviet-hr                     # list restore points (30 days)
npx wrangler d1 time-travel restore matviet-hr --timestamp="…"  # point-in-time restore
```

## Rotate a secret
```bash
npx wrangler secret put MS_CLIENT_SECRET   # paste new value at prompt; redeploy not required
```

## Cron health
- Both queues drain every 5 min (`custom-worker.ts` scheduled → /api/scoring/drain + /api/emails/drain).
- Check: Cloudflare dashboard → Workers → matviet-hr → Cron Events, or `wrangler tail` and look for `[cron */5 * * * *]` lines.
- Manual drain: `curl -H "Authorization: Bearer $CRON_SECRET" https://hr.matviet.com.vn/api/scoring/drain`.

## First admin on a fresh database
```bash
curl -X POST https://hr.matviet.com.vn/api/setup -H "Authorization: Bearer $CRON_SECRET" \
  -H "content-type: application/json" -d '{"email":"…","password":"…","name":"…"}'
# 409 once any user exists. Subsequent accounts: Cài đặt → Người dùng (admin UI).
```

## Database backup (manual, before risky changes)
```bash
npx wrangler d1 export matviet-hr --remote --output=backup-$(date +%F).sql
```
