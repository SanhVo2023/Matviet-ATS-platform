# 0008 — Flat candidates table (not split persons + applications) for v1

**Date:** 2026-04-21
**Status:** Accepted
**Decision-makers:** Sanh Võ + Claude

## Context

Database identity model question: when the same person applies to multiple jobs (same email + phone, different positions over time), how do we model them?

Two designs:
- **Split:** `persons` (master identity) + `applications` (one row per person→job pair). Same person applying to 2 jobs = 1 person + 2 applications.
- **Flat:** single `candidates` table, one row per CV-per-job. Same person applying twice = 2 candidate rows.

## Decision

**Flat `candidates` table for v1.** One row per CV-per-job. Duplicate detection (same email + phone) is a UI-level warning, not a hard schema constraint.

## Alternatives considered

- **Split: persons + applications** — better history view, cleaner stats, automatic dedup. But: more tables, more joins, more migrations, more code. At 1-3 jobs/month with low repeat-applicant rate, the engineering cost outweighs the data hygiene benefit for v1.
- **Persons + applications + materialized "person history" view** — most powerful, biggest schema, way overkill for v1.

## Consequences

- **Pro:**
  - Simpler schema; faster v1 ship
  - Most queries are job-scoped anyway (HR works on one position at a time)
- **Con:**
  - Same person applying to 3 jobs = 3 separate rows; HR has to recognize them manually
  - Source effectiveness stats double-count if same person applies twice
  - Statistics involving "unique persons" require GROUP BY email
- **Mitigation:** add a duplicate detection warning when creating a candidate whose email or phone matches an existing record. UI suggests "View existing application: ..." — does not block.

## Future migration path (v2)

When candidate volume + repeat applications justify it:

1. Add migration `0NNN_persons_table.sql`:
   ```sql
   CREATE TABLE persons (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     full_name text NOT NULL,
     email text,
     phone text,
     -- canonical identity fields
     created_at timestamptz DEFAULT now()
   );
   CREATE UNIQUE INDEX persons_email_phone_idx ON persons(lower(email), phone);
   ```
2. Add `candidates.person_id uuid REFERENCES persons(id)`.
3. Backfill: dedup by `(lower(email), phone)`.
4. Update queries + UI.

This refactor is contained — no breaking schema change to other tables.

## References

- Master plan §20.2 schema notes
- ADR was decided alongside ADR-0001 through 0008 in the same planning session
