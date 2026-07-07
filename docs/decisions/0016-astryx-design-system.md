# ADR 0016 — Astryx design system + "Vị trí" position-centric workspace

- **Status:** Accepted (Sanh directive, 2026-07-07)
- **Context:** Sanh directed three intertwined changes: (1) rename "Tin tuyển
  dụng" → "Vị trí" across the app, (2) adopt **Astryx** — Meta's open-source
  design system (`facebook/astryx`, released June 2026) — as the app's design
  language, "not just replace but build the app on it", (3) make the position
  page the hiring workspace: that position's candidates as a kanban, the job
  record demoted to a tool panel.

## Decisions

### 1. Astryx adoption (pinned 0.1.3)

- `@astryxdesign/core@0.1.3` + `@astryxdesign/theme-neutral@0.1.3` (runtime)
  and `@astryxdesign/cli@0.1.3` (dev) — **exact pins, no `^`**: the library is
  v0.1.x and moving; upgrades go through `npx astryx upgrade --apply` (its
  codemods) as a deliberate PR.
- `npx astryx init --features agents --agent claude` generated the agent
  conventions doc at **`app/.claude/CLAUDE.md`** — read it before any UI work.
  Core rules adopted: discover with `astryx build/component/template` before
  writing UI; AppShell/SideNav frame pages; tokens for every value.
- Astryx ships **pre-built CSS** (no StyleX build plugin). Wired in
  `src/app/layout.tsx`: `reset.css` → `astryx.css` → built theme CSS, then
  `<Theme theme={matvietTheme} mode="light">` in `src/components/providers.tsx`
  and `data-theme="light"` on `<html>` (SSR, light-only per Sanh).

### 2. Mắt Việt theme = token overrides, not forks

`src/styles/themes/matviet/matvietTheme.ts` (scaffolded from the Neutral
theme via `astryx theme add`, then re-tokened):

- **Interactive accent = brand navy** (`#263d78`); the **signature gold CTA
  lives as a Button `variant:primary` component override** (`#fbc312` bg,
  brand-900 text) — gold as the global accent would fail text contrast on
  white.
- Neutrals/borders/status colors = the app's existing Tailwind families, so
  Astryx components and legacy Tailwind-styled components render the same
  palette side by side. `tailwind.config.ts` hexes stay **literal** (Tailwind
  `/alpha` modifiers break on `var()` values) and are the same values the
  theme resolves to.
- Typography routed through the **next/font CSS variables** via explicit
  `--font-family-*` token overrides (next/font hashes family names, so plain
  family strings would never match).
- Navy SideNav rail = theme `sidenav` component override (scoped token
  redirects). **v0.1.3 quirk:** the theme compiler emits `.astryx-sidenav`
  while the component ships `.astryx-side-nav`, so the identical rule is
  mirrored in `globals.css` (kept OUTSIDE `@layer base` — Tailwind v3
  tree-shakes custom rules inside `@layer` whose selectors don't appear in
  content files). Drop the mirror when upstream fixes the registry key.
- **Rebuild the theme after every edit**: `npx astryx theme build
  src/styles/themes/matviet/matvietTheme.ts` — the app imports the BUILT
  artifacts (`matviet.css`/`matviet.js`, `__built: true`, SSR-safe).

### 3. Tailwind v3 coexistence

We stayed on Tailwind 3.4 (the official Astryx example targets v4). This is
actually the easy direction: Astryx's CSS is `@layer`-scoped, Tailwind v3
utilities are **unlayered → they always win**, so `className` overrides on
Astryx components behave predictably. The v4-only `tailwind-theme.css` token
bridge is not used.

### 4. Component-migration boundary

- **Genuine Astryx components** own page composition and chrome: `AppShell`
  (height="auto" so print keeps natural flow), `SideNav`/`TopNav` (shell),
  and new/rebuilt surfaces going forward.
- **`src/components/ui/*` (shadcn) keeps its API** and stays for
  composition-heavy primitives (Dialog, DropdownMenu, Tabs, SlideOver…):
  their palettes already match the theme by construction, and emulating
  Radix composition APIs on Astryx would be regression-prone. Migrate
  opportunistically when a surface is rebuilt.
- AppShell content region needs `#astryx-app-shell-main { min-width: 0 }`
  (globals.css) or wide children (kanban) expand the layout track past the
  viewport instead of scrolling internally.

### 5. Rename "Tin tuyển dụng" → "Vị trí" incl. route slug

- Full rename: labels/i18n/agent prompts AND the route (`/tin-tuyen-dung` →
  `/vi-tri`), with **permanent redirects** in `next.config.ts` so bookmarks
  and agent-emitted links keep working. "Đăng tin" → "Đăng tuyển",
  "Tạo tin mới" → "Tạo vị trí mới".

### 6. Position page = hiring workspace

- `/vi-tri/[id]` renders the **kanban** (existing `KanbanBoard`, role-scoped
  `listCandidates`) + a stage-count strip; header actions: table-view link,
  **"Thông tin vị trí"** SlideOver (`JobInfoPanel` — the old page's sections
  as a fact sheet + QR/edit/status), CSV import, gold "Thêm ứng viên".
- `/vi-tri/[id]/pipeline` → redirect (deep links preserved). Exec roles
  (bod/tap_doan) get the fact sheet inline, no kanban.
- `/vi-tri` list shows per-job tallies (`countCandidatesByJob()`), and
  `/ung-vien` remains the global cross-position table (Sanh, 2026-07-07).

## Consequences

- The visible design language (shell, tokens, type scale, radius, motion)
  is Astryx-defined and re-themeable from one file; brand identity (navy
  rail + gold CTA) survives via theme overrides only.
- Upstream 0.1.x churn is contained by exact pins + the documented quirks
  above; revisit the `sidenav` mirror and the theme build on every bump.
