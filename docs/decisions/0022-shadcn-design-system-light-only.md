# ADR 0022 — shadcn/ui is the design system; Astryx is shell-only; light mode only

- **Status:** Accepted
- **Date:** 2026-09-07
- **Supersedes:** the design-system posture of [ADR 0016](0016-astryx-design-system.md)
  (Astryx as the app-wide system). ADR 0016's shell decision (AppShell + SideNav) stands.
- **Deciders:** Sanh Võ (product owner), Claude (builder)
- **Context source:** post-audit renovation (plan `how-about-the-ui-silly-origami`), UI visual audit.

## Context

The 2026-09-07 UI audit found that Astryx (`@astryxdesign/*`, ADR 0016) is **structurally
unenforceable** in this codebase:

- Only **4 of 149** Astryx components are used (6 files import it: shell + tabs + theme).
- Its `tailwind-theme.css` token bridge **requires Tailwind v4**; the app pins **v3.4**, so
  Astryx tokens were never wired into utilities.
- Token collisions: `--color-accent` = navy (matviet.css) vs `--accent` = gold (globals.css);
  `bg-surface` meant opposite things in the two systems.
- Cascade-layer inversion: unlayered Tailwind v3 utilities beat layered Astryx rules, forcing a
  growing pile of `globals.css` overrides.

Meanwhile the app already had a coherent, token-backed shadcn/ui + Tailwind v3.4 system in
practice (97 consistent toasts, Badge discipline, radix dialog primitives, a navy-tinted
`slate` ink ramp, a gold-CTA `Button` default variant). The real system was shadcn; Astryx was
aspirational overlay.

The theme also carried ~90 `light-dark()` pairs, but the app hardcodes light everywhere and no
component supports dark. Dark mode was cost with no benefit for a ≤5-user internal tool.

## Decision

1. **shadcn/ui + Tailwind v3.4 IS the official design system.** Primitives in
   `src/components/primitives/`, form/dialog/dropdown/button via shadcn `ui/*`, feature
   components under `src/components/features/<domain>/`.
2. **Astryx stays shell-only** — `AppShell` + `SideNav` (the navy rail override in
   `globals.css` is intentional, a v0.1.3 selector quirk). Never extend Astryx usage.
   No Tailwind v4 migration.
3. **`slate` is the canonical ink ramp** (overridden navy-tinted in `tailwind.config.ts`);
   `bg-white` is the canonical raised surface. Do NOT mass-migrate the ~349 `bg-white`/`slate`
   call sites to invented `bg-surface`/`border-border` tokens — bless the existing ramp.
4. **Brand hexes for non-Tailwind surfaces** (email HTML, react-pdf, exceljs, QR canvas) come
   from `src/lib/brand.ts` (navy `#0b1430` + gold `#fbc312`). No raw hex in TSX.
5. **Dark mode is CLOSED** — light-only is official. Never add `dark:` classes; `providers.tsx`
   `mode="light"` stays. `matviet.css`'s `light-dark()` pairs are dormant by design.

The agent-facing conventions live in `app/.claude/CLAUDE.md` (rewritten to this lane).

## Consequences

- **Positive:** one enforceable system; no phantom token bridge; the override pile stops
  growing; conventions match reality so future UI work is predictable; dark-mode surface area
  (and its untested failure modes) eliminated.
- **Negative / accepted debt:** Astryx remains a dependency for the shell only (pinned 0.1.3);
  a set of cosmetic consolidations (PageContainer, single StatusPill/ScoreChip, table-style
  unification, `focus:`→`focus-visible:` codemod, AgentDock→radix dialog, STAGE_GROUPS
  emoji→lucide) are documented as deferred polish, not launch blockers.
- **If we ever want dark mode:** it is a deliberate future project (component-by-component),
  not a flip of a switch — the tokens exist but nothing is verified against them.
