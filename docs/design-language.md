# Mắt Việt HR — Design Language (v2, 2026-07-03)

Shared design language with the Mắt Việt voucher-wallet app (Sanh's reference). Premium navy + gold. This document is the single source of truth for UI work; tokens live in `app/tailwind.config.ts`.

## 1. Brand

Navy + gold, premium feel. Navy chrome (`brand-900 #0b1430`) for the sidebar/auth splash; the white Mắt Việt mark sits on navy. Gold is the signature, used sparingly and decisively.

## 2. Color tokens (Tailwind)

| Role | Classes | Hex |
|---|---|---|
| Brand navy scale | `brand-50…950` | `#eef2fb` → `#070d20`; `brand-500 #2f4a8f`, chrome `brand-900 #0b1430` |
| Gold (signature) | `accent-400` | `#fbc312` (scale `accent-50…700`) |
| Surface | `surface` / `surface-raised` (= `slate-50` / white) | `#f3f5fa` / `#ffffff` |
| Ink | `ink` / `ink-muted` (= `slate-900` / `slate-500`) | `#11183a` / `#667192` |
| Border | `slate-200` | `#e6e9f2` |
| Status | `success` / `warning` / `danger`(+`error` alias) | `#12a05f` / `#ef7a00` / `#e0413a` |
| Interactive | `primary-*` (= brand scale) | links/rings `primary-500/600` |

**The `slate` scale is overridden** with navy-tinted neutrals — existing `text-slate-*`/`bg-slate-*`/`border-slate-*` classes automatically render in the new palette. Radius: cards `rounded-lg` = 1rem; controls `rounded-md` = 0.625rem.

**Signature CTA** = gold bg + navy text: Button `default` variant (`bg-accent-400 text-brand-900 font-semibold`). Navy-solid secondary strength: Button `variant="navy"`. One gold CTA per view; everything else outline/ghost/navy.

## 3. Typography

**Be Vietnam Pro** throughout (already via `next/font`). Headings extra-bold navy (`font-extrabold text-brand-900`); body ink (`text-slate-900`); secondary `text-slate-500`. Numbers use `tabular-nums`.

## 4. Motion principles

- **framer-motion** for everything interactive; **gsap** ONLY for the auth splash entrance (`(auth)/AuthSplash.tsx`). Everything respects `prefers-reduced-motion` (use the provided helpers — they handle it).
- **Signature "tab slicer"** — `ui/segmented.tsx`: gold pill slides between options via shared layout (`layoutId`, spring `stiffness 400 / damping 32`). Use for list/table/kanban toggles, period pickers, filter groups. **Each instance needs a unique `id`.**
- Dashboard: **`CountUp`** numbers, staggered section entrances (`Stagger`/`StaggerItem`/`FadeIn` from `components/motion`).
- Modals/SlideOvers: spring-feel entrance (overshoot cubic-bezier), fixed full-screen backdrop, capped height, **sticky header + sticky footer + internally scrolling body** (`overscroll-contain`).

## 5. Shared components

| Component | Where | Notes |
|---|---|---|
| `Segmented` | `ui/segmented.tsx` | signature tab slicer; unique `id` per instance |
| `Badge` | `ui/badge.tsx` | tones: neutral/brand/accent/success/warning/danger |
| `Button` | `ui/button.tsx` | `default`=gold CTA, `navy`, destructive/outline/ghost/link |
| Dialog + `DialogBody`/`DialogFooter` | `ui/dialog.tsx` | sizes md/lg/xl, sticky anatomy |
| `SlideOver` (+`.Body`/`.Footer`) | `primitives/SlideOver.tsx` | forms/composers |
| `PageHeader` | `primitives/PageHeader.tsx` | icon + title + subtitle + action — EVERY page |
| `CountUp` | `primitives/CountUp.tsx` | dashboard numbers |
| `FadeIn`/`Stagger`/`StaggerItem` | `components/motion` | entrance choreography |
| `StatusBadge`/`StageBadge`, `EmptyState`, `DataTable`, `FileDropZone` | `primitives/` | pre-existing, retinted by token override |

## 6. Responsive model

- **Hiring manager (mobile-first persona):** mobile = bottom tab bar (Tổng quan / Ứng viên / Phỏng vấn / Phê duyệt) + drawer for the rest.
- **HR/admin (desktop-first):** hover-expand sidebar — slim icon rail that expands to full labels on hover (overlay, no layout shift); grouped nav (TUYỂN DỤNG / NHÂN SỰ / HỆ THỐNG); mobile = hamburger drawer.

## 7. Writing

Vietnamese, sentence case, active verbs on controls ("Lưu thay đổi", not "Gửi"). Errors say what happened and what to do next. Empty states invite the next action.
