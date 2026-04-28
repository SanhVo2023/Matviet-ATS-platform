# Brand Assets — Mắt Việt HR

Source files delivered by designer (2026-04-28). PNG format. SVG conversion deferred to v2.

## Use-case mapping

| File | Glyph color | Wordmark color | Use case | Component prop |
|---|---|---|---|---|
| **MV2.png** | Yellow (heart-iris) | Navy | **Primary lockup** for white/light backgrounds (most common) | `<Logo variant="primary" />` |
| **MV6.png** | White (heart-iris) | Yellow | Full lockup for navy/dark backgrounds (sidebar header on `brand-navy` bg) | `<Logo variant="on-dark" />` |
| **MV3.png** | (wordmark only) | Navy | Compact wordmark for headers on light bg | `<LogoWordmark variant="navy" />` |
| **MV5.png** | (wordmark only) | Yellow | Compact wordmark for navy bg | `<LogoWordmark variant="yellow" />` |
| **MV1.png** | Yellow | Yellow | Monochrome yellow for accent placements | `<Logo variant="mono-yellow" />` |
| **MV4.png** | White | Navy | Reverse for yellow-accent backgrounds | `<Logo variant="on-yellow" />` |

## Brand glyph

The eye-shape with **heart-shaped iris** is the brand mark. It evokes "Mắt Việt EYE CARE" — eye + care = heart. Use the glyph alone where space is tight (sidebar collapsed, favicon, app icon).

## Brand colors observed (in source PNGs)

- **Brand navy:** ~`#13245C` (deep, slightly purple-toned navy)
- **Brand yellow:** ~`#FFC107` (sunny, saturated, warm)

These are documented in `docs/ui-ux.md` §2 as `brand-navy` and `brand-yellow` Tailwind tokens. Interactive UI elements (buttons, links, status badges) use the lighter Tailwind `primary` (blue) and `accent` (amber) scales — they coexist with brand colors without clashing.

## Derivatives to generate during Group 1

The `scripts/generate-favicons.ts` Sharp script crops MV2 into:

- `favicon-16.png`, `favicon-32.png`, `favicon-48.png` (combined into `favicon.ico` via icon-gen)
- `apple-touch-icon.png` (180×180)
- `pwa-icon-192.png`, `pwa-icon-512.png`

The OG image (`og-image.png`, 1200×630) is composed at build time:
- Background: `brand-navy` (#13245C)
- Center: MV6 logo (white eye + yellow wordmark)
- Below logo: tagline "Hệ thống quản lý tuyển dụng thông minh" in white
- Subtle yellow accent border bottom

Both scripts run via `npm run brand:generate` after dependencies are installed.

## Adding new variants

If a new color combination is needed (e.g., monochrome black for printing):

1. Either ask designer for new variant OR use ImageMagick to recolor an existing one
2. Add file as `MV<N>.png` to maintain naming consistency
3. Update the table above + the `<Logo>` component's `variant` prop type
4. Document the use case in `docs/ui-ux.md` §1

## SVG conversion (v2 nice-to-have)

When ready to upgrade:
1. Open MV2.png in Inkscape → Path > Trace Bitmap → save as `MV2.svg`
2. Or use https://vectorizer.ai (paid)
3. Or commission designer for proper SVG source files
4. Add SVG variants alongside PNGs; `<Logo>` component prefers SVG, falls back to PNG

SVG benefits: crisp at any zoom, smaller file size, easier to recolor via CSS, accessibility (can include `<title>` for screen readers).
