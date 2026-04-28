# 0007 — No File Search and no pgvector in v1

**Date:** 2026-04-21
**Status:** Accepted
**Decision-makers:** Sanh Võ + Claude

## Context

Two semantic-search-over-CVs options were evaluated:

1. **Gemini File Search API** (Google-managed RAG, launched Nov 2025) — auto-chunks, embeds, indexes uploaded files; query semantically with citations.
2. **pgvector + Gemini embeddings** (self-hosted) — embed CVs into a `vector` column in Postgres; cosine similarity queries.

Use case if added: cross-corpus queries like "find all candidates who mentioned 'inventory management'" or "candidates similar to our best hire."

## Decision

**Skip both for v1.** Postgres FTS over `cv_raw_text` covers HR's known query patterns at our scale.

## Alternatives considered

- **Gemini File Search** — wrong primitive for per-CV rubric scoring (designed for cross-corpus retrieval). Privacy unfit for VN PII at standard API tier — files persist in Google's index indefinitely until manually deleted, and at standard tier may be human-reviewed. Cost is trivial (~$0.02/month indexing) but complexity isn't worth it for 50 CVs/month.
- **pgvector + embeddings** — more control, but at 50 CVs/month FTS handles all known queries. Adds operational load (vector index tuning, embedding cost) for no real benefit.

## Consequences

- **Pro:**
  - Simpler architecture; one less moving part
  - All search uses Postgres FTS (`to_tsvector('simple', cv_raw_text)` GIN index already in schema)
  - JSONB GIN on `cv_parsed -> 'skills'` covers structured skill search
  - No CVs uploaded to Google's File Search index — privacy posture cleaner
- **Con:**
  - "Find candidates similar to X" queries aren't possible
  - Synonym matching limited (FTS doesn't catch paraphrases — "team lead" won't match "supervisor")
- **Re-evaluate triggers:**
  - Candidate volume crosses ~2000 (FTS still works but not as snappy on UX-sensitive paths)
  - HR explicitly asks for semantic search ("find candidates similar to our best hire")
  - We add a "discover similar candidates" feature in v2

## Implementation impact

- No `vector` column in any table for v1
- No File Search store created in Gemini
- Search relies on:
  - Postgres FTS GIN index on `to_tsvector('simple', coalesce(cv_raw_text,''))`
  - JSONB GIN on `cv_parsed -> 'skills'`
  - Trigram on name/email for type-as-you-search

## Future migration path (if/when triggered)

Add migration `0NNN_pgvector.sql`:
```sql
CREATE EXTENSION vector;
ALTER TABLE candidates ADD COLUMN cv_embedding vector(768);
CREATE INDEX ON candidates USING hnsw (cv_embedding vector_cosine_ops);
```

Backfill embeddings via a one-time cron drain of all candidates with `cv_parsed IS NOT NULL`. Cost: ~$0.03 for 1000 candidates with `text-embedding-004`.

## References

- Master plan PART X (Deferred / Rejected)
- Gemini File Search docs: https://ai.google.dev/gemini-api/docs/file-search
- pgvector: https://github.com/pgvector/pgvector
