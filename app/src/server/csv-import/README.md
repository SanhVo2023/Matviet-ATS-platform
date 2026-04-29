# `server/csv-import`

CSV-import-from-job-board module — Group 9.

## Purpose

Bulk-create candidates from a TopCV or CareerViet employer-export CSV. Two-phase: **preview** (no writes) → **commit** (inserts + optional CV download + scoring enqueue).

## Source-specific column maps

`HEADER_MAPS` in `service.ts` maps normalized headers (lowercased + accent-stripped) to four canonical fields: `full_name`, `email`, `phone`, `cv_url`.

| Source       | Sample columns picked                                   |
| ------------ | ------------------------------------------------------- |
| `topcv`      | "Họ và tên", "Email", "Số điện thoại", "Link CV"        |
| `careerviet` | "Tên ứng viên", "Địa chỉ email", "Điện thoại", "URL CV" |

Both sources share most lowercased headers ("email", "phone", "cv"), so the maps overlap. Headers not in the map are preserved in `source_meta` but not used.

If a column doesn't auto-map, the UI surfaces a `<ColumnMappingDropdowns>` so HR can fix it manually before commit.

## Duplicate detection

Within the same job, a row is flagged as duplicate if either:

1. `email` matches an existing candidate (case-insensitive) — primary signal.
2. `normalized phone` matches an existing candidate's normalized phone — fallback for rows missing email.

Phone normalization (`normalizePhone` in `lib/validation/csv-import.ts`):

- Strips spaces, dashes, dots, parens.
- Converts leading `+84` to `0` (Vietnamese mobile convention).
- Returns digits only.

So `"+84 901 234 567"` and `"0901-234-567"` collapse to `"0901234567"`.

## CV download

If `fetch_cvs=true` (default) and the row has `cv_url`, the importer fetches the CV with:

- Concurrency cap: 5 (CLAUDE.md `concurrentUploadsMax`).
- Timeout: 30s per fetch.
- MIME whitelist: PDF only.
- Size cap: 10 MB.

Failures don't abort the import — the candidate row is still created, just without a CV. `notes` records the failure reason; HR can attach manually later.

## Scoring kickoff

Every successfully-inserted candidate gets `enqueueScoring()` + fire-and-forget `triggerEdgeFunction()`. Same pattern as the manual upload path — the scoring drain cron picks up anything that misses.

## Why admin client

The bulk insert and duplicate scan use the admin client to:

1. Bypass RLS for performance (no per-row check).
2. Scan all candidates regardless of caller's RLS visibility (HR/admin sees everything anyway, but this keeps the code uniform).

The calling Server Action (`commitImportAction` in `app/(dashboard)/tin-tuyen-dung/[id]/import/actions.ts`) MUST guard with `requireRole(["admin","hr"])`. Authorization happens at the action boundary; the service layer trusts the caller.
