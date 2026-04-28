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
