# Database Branch Log — Mắt Việt HR

Tracker for every Supabase database branch (`mcp__supabase-matviet__create_branch`).

**Policy:**
- Risky migrations (touching `candidates`, `applications`, `interview_reviews`, `email_logs`, `approvals`) MUST go through a branch.
- Pure additive migrations (new tables) can apply directly to main.
- Branches > 7 days unmerged are flagged. Run `mcp__supabase-matviet__list_branches` weekly.
- On PR merge: branch is merged or deleted in the same chat turn. Never deferred.

**Format:**
| Branch ID | PR | Created | Purpose | Status | Disposition | Resolved |

---

## Active

| Branch ID | PR | Created | Purpose | Status | Disposition | Resolved |
|---|---|---|---|---|---|---|
| _(none yet)_ | | | | | | |

---

## Archive

| Branch ID | PR | Created | Purpose | Status | Disposition | Resolved |
|---|---|---|---|---|---|---|
| _(none yet)_ | | | | | | |

---

## How to use

### Creating a branch
```
mcp__supabase-matviet__get_cost(type='branch', organization_id='<id>')
# present cost to Sanh, get confirm_cost_id
mcp__supabase-matviet__create_branch(
  project_id='xeyqbapegqeibeqrwnkm',
  name='migration-test-<group-name>',
  confirm_cost_id='<id>'
)
```

Add an "Active" row to the table above:
```
| <new-branch-id> | #<pr> | YYYY-MM-DD | <purpose> | testing | (open) | — |
```

### Disposing a branch

**Merge into main** (after smoke test passes):
```
mcp__supabase-matviet__merge_branch(branch_id='<id>')
```
Move row to "Archive" with `Status: merged` and today's date.

**Delete** (rollback, abandoned, or already merged via separate path):
```
mcp__supabase-matviet__delete_branch(branch_id='<id>')
```
Move row to "Archive" with `Status: deleted` and today's date.

### Weekly cleanup

Run every Monday:
```
mcp__supabase-matviet__list_branches(project_id='xeyqbapegqeibeqrwnkm')
```

Cross-reference with this log:
- Branches in MCP but not in this log → log them
- Branches > 7 days in "Active" → ping PR owner; consider deletion if PR abandoned
- Branches in MCP that should be deleted per this log → delete

---

## Status legend

- `testing` — branch created, migration applied, smoke tests in progress
- `merged` — successful merge to main
- `deleted` — rolled back or abandoned (no main-data impact)
- `superseded` — replaced by a later branch testing the same migration
