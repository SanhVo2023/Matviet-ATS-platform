# Build Log — Mắt Việt HR

Append-only ledger of decisions, surprises, and notes during the build. One line per entry. **Format:** `YYYY-MM-DD | category | author | note`.

Categories: `decision`, `surprise`, `migration`, `dep`, `cost`, `incident`, `note`.

When a decision is significant enough to outlive a session, **promote to a numbered ADR** at `docs/decisions/00NN-<slug>.md` and reference here.

---

## 2026-04

```
2026-04-21 | decision | Sanh+Claude | Plan v5.0 finalized. 11 build groups, 11 FRs, persona-scoped mobile, decoupled scoring. ADRs 0001-0008 written.
2026-04-21 | decision | Sanh+Claude | OpenCATS fork rejected. Greenfield Next.js + Supabase. ADR-0001.
2026-04-21 | decision | Sanh+Claude | Resend rejected — broken Outlook reply threading. MS Graph for outbound + inbound + calendar. ADR-0002.
2026-04-21 | decision | Sanh+Claude | No AI Chat panel v1. Score Card with verified evidence quotes is sufficient. ADR-0003.
2026-04-21 | decision | Sanh+Claude | Decoupled scoring: raw per-criterion scores stored, weights applied at query time. ADR-0004.
2026-04-21 | decision | Sanh+Claude | Persona-scoped mobile: HR desktop, manager mobile-optimized. ADR-0005.
2026-04-21 | decision | Sanh+Claude | Paid Gemini API tier (no training on inputs). Vertex AI deferred. ADR-0006.
2026-04-21 | decision | Sanh+Claude | No File Search / pgvector v1. FTS over parsed CV text suffices. ADR-0007.
2026-04-21 | decision | Sanh+Claude | Flat candidates table v1, not split persons + applications. ADR-0008.
2026-04-21 | decision | Sanh | Hard limits + cost guardrails + browser support + locale + retention all locked. See CLAUDE.md §Operational defaults.
2026-04-21 | dep | Sanh | Project-scope MCP `supabase-matviet` configured at .mcp.json with new PAT.
2026-04-28 | dep | Sanh | Supabase project created: "Mắt Việt HR application", ref xeyqbapegqeibeqrwnkm, region ap-southeast-2 (Sydney), Postgres 17.6.1.111, ACTIVE_HEALTHY.
2026-04-28 | surprise | Claude | Region is Sydney (ap-southeast-2), not Singapore (ap-southeast-1) as plan suggested. Latency diff ~30ms — negligible at our scale (50 CVs/mo, 5 users). Keeping Sydney; not recreating.
2026-04-28 | dep | Sanh+Claude | MCP verification: list_organizations returned "SanhVo2023's Org" + Vercel-integrated org. Project visible. Auth confirmed correct.
2026-04-28 | note | Claude | Doc structure split per §0.10: CLAUDE.md, README.md, docs/{PRD, architecture, ui-ux, integrations, api, infra-checklist, runbook, privacy-notice-vi, build-log, branch-log}.md + docs/decisions/ + docs/content/ + docs/samples/. Replaces monolithic plan loading per session.
2026-04-28 | decision | Sanh | Content drafts approved: email-templates.md, scoring-rubrics.md, ui-strings.md. Final per-template tone spot-check by chị Hương deferred to staging-review during Group 6; doesn't block Group 1-5.
2026-04-28 | dep | Sanh | Logo assets delivered to app/public/brand/ as MV1.png-MV6.png. Heart-in-eye iris glyph; brand uses navy + sunny yellow. SVG versions deferred to v2 (PNG sufficient for v1).
2026-04-28 | surprise | Claude | Brand colors more saturated than initial spec: brand navy is deeper (~#13245C) vs planned primary-900 (#1E3A8A); brand yellow is sunnier (~#FFC107) vs planned amber-500 (#F59E0B). Added brand-navy + brand-yellow tokens to ui-ux.md alongside Tailwind blue/amber for interactive UI.
2026-04-28 | decision | Sanh+Claude | Group 0 baseline pushed to https://github.com/SanhVo2023/Matviet-ATS-platform (branch main). Group 1 starts on feat/01-foundation.
2026-04-28 | decision | Claude | Schema name reconciliation: migrations 0001-0010 are the source of truth, NOT docs/architecture.md §3. Naming deltas to remember when reading docs: `user_role` has 5 values (admin/hr/hiring_manager/bod/tap_doan), not 3; pipeline_stage uses test_sent/test_done/recommended/salary_deal/tap_doan_review/withdrew (not assessment_sent/done/proposed/salary_negotiation/group_review/withdrawn); role_family is sales/optician/office/manager/custom (not optical_tech/management); recommendation is strong_yes/yes/maybe/no (not strong_hire/hire/no_hire); table names are interview_attendees + interview_evaluations + email_messages + audit_log + cv_files (separate table for CV blobs); approval_step_kind values are hr_recommend/manager_recommend/salary_deal/bod/tap_doan. Architecture doc updated with banner; ui-strings.md keys realigned. Code generation uses migration names; types come from generate_typescript_types.
2026-04-28 | migration | Claude | Applied 0008 (RLS) + 0009 (storage buckets) + 0010 (seed) to live Supabase. RLS enabled on all 20 tables. Seeded: 4 weight_templates + 7 email_templates + 5 departments + 5 storage buckets (cvs/assessments/submissions/email-attachments/assets).
2026-04-28 | migration | Claude | Applied 0011 (security hardening: pin search_path on 5 SECURITY DEFINER fns) + 0012 (revoke EXECUTE FROM PUBLIC on 9 internal helpers) + 0013 (revoke EXECUTE from authenticated on the 3 RLS helpers Supabase auto-grants). Advisor went from 20 WARNs → 3 (extension_in_public for pg_trgm/unaccent + public_bucket_allows_listing for assets — all accepted).
2026-04-28 | decision | Sanh+Claude | Pro plan upgrade DEFERRED to Group 11 (pre-launch). Project is on free tier and works fine for build groups 1-10; PITR + 100GB Storage become valuable only at production launch.
2026-04-28 | surprise | Claude | @supabase/supabase-js 2.47 + strict TS narrows .select("*").maybeSingle() data to `never` instead of the Row type. Workaround: explicit `as Tables<"profiles">` cast after the query. Documented in src/lib/supabase/server.ts.
2026-04-28 | dep | Claude | Added sharp + tsx (dev) for brand derivatives generation; husky + lint-staged (dev) for pre-commit; @eslint/eslintrc + @eslint/js (dev) to migrate ESLint to flat config (.eslintrc.json deleted in favor of eslint.config.mjs using FlatCompat with eslint-config-next).
2026-04-28 | decision | Claude | ESLint pre-commit hook DROPPED for now (pre-commit runs prettier only). Rationale: lint-staged was reverting commits because of ESLint 9 / next-config legacy interop friction. CI workflow runs `npm run lint` on every PR; that's sufficient at our scale.
2026-04-28 | note | Claude | Group 1 PR pushed to feat/01-foundation. PR URL: https://github.com/SanhVo2023/Matviet-ATS-platform/pull/new/feat/01-foundation. Sanh to open + merge after review.
2026-04-28 | dep | Claude | Group 2 deps: @tiptap/{react,starter-kit,pm} 3.22 (rich text editor), nuqs 2.8 (URL-synced filter state), @tailwindcss/typography (prose styling for Tiptap content + JD rendering on detail page).
2026-04-28 | decision | Claude | Group 2 stacked on top of feat/01-foundation. PR will rebase to main once Group 1 merges (or GitHub will auto-update the diff). No new migrations in Group 2.
2026-04-28 | decision | Claude | Job description + requirements stored as `{html: "..."}` jsonb (not raw text). Forward-compat with structured requirements (skills lists, criteria) when v2 form builder lands. Tiptap StarterKit schema sanitizes input — no arbitrary HTML.
2026-04-28 | decision | Claude | jobs.weights stored as numbers 0-1 (not 0-100). Form sliders display 0-100 % and convert. WeightsEditor "Chuẩn hóa về 100%" button rescales sliders proportionally if user drifts off the budget.
2026-04-28 | decision | Claude | Job assignment via `job_assignments` is "replace wholesale" on update (delete all + reinsert). Assignment set is small (≤10 rows per job) so simpler than diff. RLS allows because admin/HR owns the table.
2026-04-28 | decision | Claude | listHiringManagers() uses the service-role admin client to traverse profiles + departments JOIN that auth.users RLS doesn't simplify. Caller (server action) MUST be admin/hr — enforced at the action layer with requireRole.
2026-04-28 | surprise | Claude | Same supabase-js typing issue as G1 hits insert/update payloads (narrows to `never`). Workaround: type-annotate payload via TablesInsert<>/TablesUpdate<> then cast `as never` at the .insert/.update call. Compile-time correctness preserved by the explicit annotation; cast just disarms postgrest's inference quirk.
2026-04-28 | dep | Claude | Group 3 deps: react-pdf 10.4 (currently unused — iframe handles PDF preview in v1; kept in deps for G4 text-layer extraction). No new migrations.
2026-04-28 | decision | Claude | CV preview uses `<iframe>` not react-pdf in v1. Reasons: zero JS payload cost (browsers render PDF natively), Vietnamese diacritics rendered by browser PDF viewer, no service-worker setup needed. Will swap for react-pdf in G4 when text-layer + evidence-quote highlighting matter.
2026-04-28 | decision | Claude | Atomic candidate+CV upload: pre-allocate candidate UUID server-side → upload to Storage → insert cv_files (admin client, bypasses RLS) → insert candidates (RLS-aware). On failure at any step, attempt rollback of preceding writes/uploads. Uses createAdminClient because cv_files RLS write requires is_hr(); the calling Server Action enforces requireRole.
2026-04-28 | decision | Claude | Filename slugification: strip Vietnamese diacritics via NFD + combining-mark removal, then ASCII-safe regex. Original (Vietnamese) filename preserved in cv_files.original_name for display. Storage path is `{candidate_id}/{slugified}.{ext}`.
2026-04-28 | decision | Claude | Stage transitions in v1: terminal states (rejected/withdrew) block further transitions; from `hired` only `withdrew` is offered. Server action re-validates client-proposed transitions against allowedNextStages(). Stage_history is auto-populated by the trigger added in migration 0007.
2026-04-28 | decision | Claude | DOCX deferred: G3 accepts DOCX upload (per CV_ACCEPTED_MIMES), but the preview surfaces a "tải về" card instead of inline render. G4's LibreOffice worker on Fly.io will convert DOCX → PDF + populate cv_files.pdf_storage_path so the preview unifies on PDF.
2026-04-28 | note | Claude | Group 3 PR pushed to feat/03-candidates-cv (stacked on feat/02-jobs-crud). 15 routes total. Awaiting Sanh merge of G1/G2 first.
2026-04-29 | dep | Sanh | G4 secrets handed over: Gemini API key (paid tier, no training), Supabase service-role JWT, plus the new sb_publishable / sb_secret pair. Written to app/.env.local (gitignored). Legacy JWT keys remain canonical until @supabase/ssr supports the new format.
2026-04-29 | migration | Claude | Applied 0014 (scoring_queue table + ai_screening_status enum + scoring_job_status enum + ai_screening_status/error/scored_at columns on candidates + pick_scoring_job() + reaggregate_job_scores() + bump_candidate_score trigger updated to also set ai_screening_status='success') and 0015 (revoke EXECUTE on reaggregate_job_scores from authenticated — closes the only new advisor finding). Advisors back to the 3 pre-existing accepted WARNs.
2026-04-29 | decision | Claude | Decoupled scoring locked in: ai_screenings.criteria stores raw per-criterion scores + verified evidence quotes; weighted total denormalized onto candidates.ai_score via the bump_candidate_score trigger. Weight changes call reaggregate_job_scores() server-side — pure SQL, NO Gemini call, instant re-rank.
2026-04-29 | dep | Claude | G4 deps already installed in G2/G3 (no new lines): @google/genai 0.7, fuse.js 7 (evidence fuzzy match). Edge Function bundle imports via Deno npm:specifier from deno.json.
2026-04-29 | decision | Claude | Edge Function `score-candidate` deployed via MCP (verify_jwt=false; performs its own constant-time bearer check against SCORING_INTERNAL_SECRET). 9 files in the bundle: index.ts + types/schemas/weights/evidence/prompts/rubric/cost/deno.json. Files duplicated from app/src/{lib/ai/gemini,server/scoring} because Edge Functions are isolated from the Next.js bundler — single source of truth lives Next-side; the Deno copies note this in their banner.
2026-04-29 | note | Claude | Edge Function secrets must be set MANUALLY by Sanh via Supabase dashboard → Edge Functions → score-candidate → Secrets. Required: GEMINI_API_KEY, GEMINI_MODEL=gemini-2.5-flash, SCORING_INTERNAL_SECRET. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected. MCP doesn't expose a secrets endpoint; Supabase CLI does (`supabase secrets set`) but no CLI installed yet. Until set, the function returns 200/idle and silently fails to actually score — the candidate's "Phân tích AI" tab will keep polling.
2026-04-29 | decision | Claude | Async pipeline architecture: upload → enqueueScoring (admin client, idempotent) → triggerEdgeFunction (fire-and-forget POST, keepalive=true). Cron drain at /api/scoring/drain runs every 5 min via Netlify Function shim (netlify/functions/scoring-drain.ts hits the API route with CRON_SECRET). The Server Action's keepalive POST is the fast path; the cron is the safety net for cold-start drops.
2026-04-29 | decision | Claude | Failure handling: rate_limit/5xx → exponential backoff up to 3 retries; quota → next_retry_at = next midnight UTC+7; schema/invalid_pdf → no retry, candidates.ai_screening_status='failed' + error stored. Manual sliders + retry button shown in UI for failed cases. DOCX without pdf_storage_path falls into this bucket with reason "Cần chuyển đổi DOCX sang PDF" until LibreOffice worker is deployed.
2026-04-29 | decision | Claude | Evidence quote validation uses Fuse.js with threshold 0.3 (search range), verified bar at score < 0.05 (≈90% similarity). Quote first checked as exact NFC-lowercase substring; fuzzy fallback only on miss. Threshold tunable after first 5 real CVs.
2026-04-29 | decision | Claude | LibreOffice worker scaffolded at libreoffice-worker/ (sibling of app/) but NOT deployed in this PR. Sanh runs `fly launch` + `fly secrets set` + `fly deploy` once Gemini + Edge Function flow proven on PDF first. README documents the 4-step deploy. DOCX path falls into manual-scoring fallback until then.
2026-04-29 | surprise | Claude | Vitest doesn't read tsconfig paths by default — `@/` alias unresolved on first run. Added vitest.config.ts with explicit alias. Tests: 17 passing (weights × 11, evidence × 6).
2026-04-29 | note | Claude | Group 4 ready to push. 16 routes (added /api/scoring/drain). Build: clean. Typecheck: clean. Lint: only pre-existing warnings. Per-CV cost projection: $0.002–0.005 at 2.5 Flash pricing — well under the $5/day soft alert at our 50 CVs/month.
2026-04-29 | surprise | Claude | Three latent bugs caught the moment Sanh first opened the app in browser (auto-mode dev had never exercised the logged-in flow): (1) types/env.ts used `process.env[key]` computed access — Next.js inlines NEXT_PUBLIC_* only on direct `process.env.NAME`. Fixed in 91b228a. (2) Migration 0013 revoked EXECUTE on RLS helpers from authenticated, breaking every authenticated SELECT with 42501 — Postgres requires the CALLER to have EXECUTE even on SECURITY DEFINER fns; RLS evaluates in the caller's context, not the owner's. Reverted in migration 0016 / commit 5fa3996. (3) nuqs 2.x requires <NuqsAdapter> wrapper for Next App Router; missing since G3 — fixed in 2fa8249.
2026-04-29 | dep | Claude | Group 5 deps: @dnd-kit/{core,sortable,utilities} already installed in G1. No new migrations.
2026-04-29 | decision | Claude | Group 5 (Pipeline Kanban) stacked on feat/04-ai-scoring. New route /tin-tuyen-dung/[id]/pipeline with 16 stage columns (PIPELINE_STAGE_ORDER), drag/drop via @dnd-kit, optimistic move + revert on action failure, stage transition validation pre-drop via allowedNextStages(). 'screening' column hidden when empty (transient system state). PointerSensor activation distance 5px so click-to-detail navigation isn't blocked by accidental tiny drags.
```

---

## How to add an entry

1. New line at bottom of relevant month section (or create new month).
2. Format: `YYYY-MM-DD | category | author | one-line note`.
3. Author = `Claude`, `Sanh`, or `Sanh+Claude` for joint decisions.
4. If decision is large enough to outlive session, write a full ADR (see `docs/decisions/`).
5. Don't edit past entries — append corrections as new entries.

---

## Reading order tips for cold-start sessions

- **First-time agent loading this project:** read `CLAUDE.md` first, then `docs/PRD.md`, then this file (recent month).
- **Resuming mid-build:** read this file's last 10 entries to get recent context, then check the active branch and PR.
- **Debugging an old behavior:** grep this file + `docs/decisions/` for the topic.
