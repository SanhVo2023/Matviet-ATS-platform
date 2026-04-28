# 0005 — Persona-scoped mobile strategy (not universal)

**Date:** 2026-04-21
**Status:** Accepted
**Decision-makers:** Sanh Võ + Claude

## Context

Three personas use the app:
- **HR Staff (chị Hương)** — daily, 80% of sessions, **laptop at desk**
- **Hiring Manager (Trưởng phòng)** — bursty 1-2× per week, often **on the store floor with phone**
- **BOD / Tập đoàn** — rare, **busy execs on phone**

Question: how much mobile coverage does the app need?

## Decision

**Mobile strategy is persona-scoped, not universal.** Manager + BOD review/decide flows are mobile-optimized. HR power-user surfaces stay desktop-first.

## Mobile coverage matrix

| Route | Desktop | Tablet | Mobile |
|---|---|---|---|
| `/login`, `/auth/*` | ✓ | ✓ | ✓ |
| `/` (HR Dashboard) | ✓ optimized | ✓ usable | ✗ deferred |
| `/` (Manager Inbox) | ✓ | ✓ | ✓ **optimized** |
| `/jobs`, `/jobs/new`, `/jobs/[id]/edit` | ✓ optimized | ✓ usable | ✗ deferred |
| `/jobs/[id]/pipeline` (kanban) | ✓ optimized | ✓ usable | ✗ deferred (kanban on mobile = pain) |
| `/candidates` (HR pool) | ✓ optimized (Excel-style) | ✓ usable | ✗ deferred |
| `/candidates/[id]` | ✓ | ✓ | ✓ **optimized** |
| `/interviews/today` (link list) | ✓ | ✓ | ✓ **optimized** |
| `/interviews/[id]` (review form) | ✓ | ✓ | ✓ **optimized** |
| `/approvals` | ✓ | ✓ | ✓ **optimized** |
| `/emails`, `/tests`, `/reports`, `/settings`, `/admin/*` | ✓ optimized | ✓ usable | ✗ deferred |

"Deferred" = layout doesn't break, but visual quality and ergonomics aren't promised. v2 may revisit.

## Alternatives considered

- **Full responsive everywhere** — every screen tested down to 375px. Most work, most edge cases (kanban on mobile is genuinely hard). Risk: mediocre on both desktop and mobile instead of great on either.
- **Desktop only v1, mobile in v2** — contradicts manager's actual workflow (on store floor); risk they bypass the system.

## Consequences

- **Pro:**
  - Mobile experience for personas who NEED it (manager + BOD)
  - Desktop-first quality for HR power-user surfaces
  - Less testing surface than full-responsive
- **Con:**
  - Two layouts (mobile vs desktop) for the routes where mobile is optimized
  - Some users (HR on a tablet on a Sunday) will see "usable but not pretty"
- **Trigger to revisit:** if usage data shows >20% mobile traffic on HR-only routes, build mobile experience for those in v2.

## Implementation notes

- Use Tailwind responsive utilities; no separate mobile app or separate routes
- Manager landing page (`/` for `role='hiring_manager'`) is genuinely mobile-first design, with desktop being a 2-column expansion
- HR landing page (`/` for `role='hr_staff'|'admin'`) is desktop-first; mobile is "readable but cramped"
- Sidebar collapses to icon-only on tablets, hamburger on phones

## References

- Master plan §13b
- `docs/ui-ux.md` §8
