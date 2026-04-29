# `server/reports`

Reports & analytics module — Group 10.

## Inputs

Every query takes a `ReportFilter`:

```typescript
interface ReportFilter {
  from: string; // ISO timestamp (inclusive)
  to: string; // ISO timestamp (inclusive)
  job_id: string | null; // null = all jobs in caller's RLS scope
  role_family: RoleFamily | null; // null = all
  source: Source | null; // null = all
}
```

URL parsing lives in `filter.ts` — `parseReportFilter(searchParams)` is lenient (invalid fields fall back to defaults). The default range is the last 30 days.

## Data sources

| Query                    | Underlying source                                       |
| ------------------------ | ------------------------------------------------------- |
| `getFunnelData`          | `funnel_stats` view (migration 0018)                    |
| `getTimeToHire`          | `time_to_hire_stats` view                               |
| `getSourceEffectiveness` | `candidates` table + `time_to_hire_stats`               |
| `getScoreDistribution`   | `report_score_distribution(...)` SQL function           |
| `getStageConversion`     | `funnel_stats` view (rolled up by adjacent-stage pairs) |
| `getHiresPerMonth`       | `funnel_stats` filtered to `stage='hired'`              |

All views use `security_invoker = on` (Postgres 15+), so RLS on the underlying tables (`candidates`, `stage_history`, `jobs`) applies for the calling user. Hiring managers see only their assigned jobs without any extra filter at the application layer.

## Stage groupings

`stage-groups.ts`:

- `ALL_STAGES` — 16 pipeline stages in canonical order.
- `STAGE_TO_SUPER` — collapse to 7 supersets (`applied`, `screening`, `interview`, `approval`, `offer`, `hired`, `rejected`) for the funnel chart.
- `ORDERED_STAGE_PAIRS` — 13 adjacent-stage pairs the conversion chart computes percentages against.

## Filter math

`getSourceEffectiveness` aggregates client-side after a filtered SELECT. At project scale (≤ 1.5K candidates/month) the round-trip is the bottleneck, not the row scan. Switch to a dedicated SQL view if NFR-01 (< 2s) trips.

`percentile()` is a linear-interpolation implementation of `numpy.percentile`'s default. Hand-rolled because we don't want a stats lib dependency for ten lines of math.

## Top-level

`buildReportPayload(filter)` runs all six queries in parallel and returns the assembled `ReportPayload`. Used by both the `/bao-cao` page and the PDF/Excel export routes — single source of truth for "what's a report."

## Adding a chart

1. Add the data shape to `types.ts`.
2. Add a query function in `queries.ts` that returns it.
3. Wire it into `buildReportPayload`.
4. Add a chart component under `app/src/components/features/reports/`.
5. Slot the chart into `app/src/app/(dashboard)/bao-cao/page.tsx`.
6. (Optional) extend the PDF / Excel builders to include the new section.
