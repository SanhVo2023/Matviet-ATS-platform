/**
 * Mắt Việt Theme — navy + gold on the Astryx neutral spine.
 *
 * Derived from the scaffolded Neutral theme (`npx astryx theme add neutral`),
 * re-tokened to the Mắt Việt design language (docs/design-language.md):
 *
 *   - Interactive accent = brand navy (600 #263d78; links/focus/controls).
 *   - The SIGNATURE CTA stays gold-on-navy — implemented as a Button
 *     `variant:primary` component override (#fbc312 bg, brand-900 text),
 *     NOT as the global accent (gold on white fails text contrast).
 *   - Neutrals = the navy-tinted ink ramp shared with tailwind.config.ts
 *     (surface #f3f5fa · border #e6e9f2 · ink-muted #667192 · ink #11183a).
 *   - Status colors = the app's existing semantic families
 *     (success #12a05f/#0b6e41 · warning #ef7a00/#9a4e00 · error #e0413a/#a02722).
 *   - Typography = Be Vietnam Pro / JetBrains Mono via the next/font CSS
 *     variables (explicit token overrides — next/font hashes family names,
 *     so plain family strings would not match its @font-face rules).
 *   - Radius: controls 0.625rem, cards/containers 1rem (matches Tailwind
 *     `rounded-md` / `rounded-lg` in this app).
 *
 * Dark-mode slots are provided (navy-deepened) for completeness, but the
 * app renders light-only (Sanh, 2026-07-07) — <Theme mode="light">.
 *
 * Categorical hues (red…pink ramps) are kept verbatim from the Neutral
 * theme: they're an OKLCH-balanced badge palette that passes WCAG AA and
 * has no brand meaning to override.
 *
 * Build: `npx astryx theme build src/styles/themes/matviet/matvietTheme.ts`
 * (regenerate after every edit — the app imports the BUILT artifacts).
 */

import { defineTheme, defineSyntaxTheme } from "@astryxdesign/core/theme";
import { neutralIconRegistry } from "./icons";

/**
 * Syntax palette — kept from the Neutral theme (OKLCH T30/T80 stops),
 * only the neutral stops re-tinted to the Mắt Việt ink ramp.
 */
const matvietSyntax = defineSyntaxTheme({
  name: "xds-matviet",
  tokens: {
    keyword: ["#700084", "#efa8ff"], // purple T30/T80
    string: ["#005600", "#a6d2a2"], // green (sat T30 / pastel T80)
    comment: ["#667192", "#9aa4c0"], // ink-muted
    number: ["#6e3500", "#ffb37f"], // orange
    function: ["#00458c", "#a0caff"], // blue T30/T80 H=255
    type: ["#700084", "#efa8ff"], // purple
    variable: ["#11183a", "#e6e9f2"], // ink / border
    operator: ["#667192", "#9aa4c0"], // ink-muted
    constant: ["#6e3500", "#ffb37f"], // orange
    tag: ["#89001a", "#ffaeaa"], // red
    attribute: ["#584400", "#eec12f"], // yellow
    property: ["#005348", "#83dac9"], // teal
    punctuation: ["#9aa4c0", "#4e587a"], // ink-muted ramp
    background: ["#f3f5fa", "#0b1430"],
  },
});

export const matvietTheme = defineTheme({
  name: "matviet",

  // Typography: Be Vietnam Pro across body + heading, JetBrains Mono for
  // code. Families here document intent; the ACTUAL families are wired via
  // explicit --font-family-* token overrides below (next/font variables).
  // Scale: base=14, ratio=1.2 (matches the current text-sm-first UI).
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: {
      family: "Be Vietnam Pro",
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: "Be Vietnam Pro",
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      weights: { 3: "bold", 4: "bold" },
    },
    code: {
      family: "JetBrains Mono",
      fallbacks:
        'ui-monospace, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  // Motion: snappier than default — matches the app's existing 200/300ms
  // Tailwind transitions.
  motion: { fast: 125, medium: 300, slow: 700, ratio: 0.75 },

  syntax: matvietSyntax,

  tokens: {
    // =========================================================================
    // Fonts — route through the next/font CSS variables (set on <body> in
    // src/app/layout.tsx). Explicit token overrides beat typography.* scale
    // outputs, so these are what components actually consume.
    // =========================================================================
    "--font-family-body":
      'var(--font-be-vietnam-pro), "Be Vietnam Pro", -apple-system, "Segoe UI", Roboto, sans-serif',
    "--font-family-heading":
      'var(--font-be-vietnam-pro), "Be Vietnam Pro", -apple-system, "Segoe UI", Roboto, sans-serif',
    "--font-family-code":
      'var(--font-jetbrains-mono), ui-monospace, "SF Mono", Consolas, monospace',

    // =========================================================================
    // Backgrounds — white surfaces float on the navy-tinted body wash
    // (#f3f5fa = Tailwind slate-50 in this app's overridden ramp).
    // Dark slots deepen into the brand navy ramp (unused while light-only).
    // =========================================================================
    "--color-background-surface": ["#ffffff", "#202a4d"],
    "--color-background-body": ["#f3f5fa", "#0b1430"],
    "--color-background-card": ["#ffffff", "#14224a"],
    "--color-background-popover": ["#ffffff", "#14224a"],
    "--color-background-muted": ["#eceff6", "#14224a"],

    // Accent = brand navy (interactive: filled controls, links, focus).
    // brand-600 #263d78 clears AA on white for text and fills alike.
    "--color-accent": ["#263d78", "#93a9de"],
    "--color-accent-muted": ["#dde5f6", "#14224a"],
    "--color-neutral": ["#11183a0F", "#FFFFFF1A"],

    // Overlays (modal scrims, hover/pressed tints) — navy-tinted
    "--color-overlay": ["#0b143080", "#000000CC"],
    "--color-overlay-hover": ["#11183a0D", "#FFFFFF0D"],
    "--color-overlay-pressed": ["#11183a1A", "#FFFFFF1A"],

    // Text — ink ramp
    "--color-text-primary": ["#11183a", "#f3f5fa"],
    "--color-text-secondary": ["#667192", "#9aa4c0"],
    "--color-text-disabled": ["#9aa4c0", "#4e587a"],
    "--color-text-accent": ["#263d78", "#93a9de"],
    "--color-on-dark": "#ffffff",
    "--color-on-light": "#11183a",
    "--color-on-accent": ["#ffffff", "#0b1430"],
    "--color-on-success": ["#ffffff", "#0b1430"],
    "--color-on-error": ["#ffffff", "#0b1430"],
    "--color-on-warning": "#11183a",

    // Icon — mirrors text
    "--color-icon-accent": ["#263d78", "#93a9de"],
    "--color-icon-primary": ["#11183a", "#f3f5fa"],
    "--color-icon-secondary": ["#667192", "#9aa4c0"],
    "--color-icon-disabled": ["#9aa4c0", "#4e587a"],

    // Status / Sentiment — the app's existing semantic families:
    //   --color-X       = text/icon stop (success-fg / error-fg / warning-fg)
    //   --color-X-muted = surface stop   (success-bg / error-bg / warning-bg)
    "--color-success": ["#0b6e41", "#9fe59b"],
    "--color-error": ["#a02722", "#ffc6c1"],
    "--color-warning": ["#9a4e00", "#fdcf4f"],
    "--color-success-muted": ["#dcf5e9", "#84c9803D"],
    "--color-error-muted": ["#fde3e2", "#ff9e973D"],
    "--color-warning-muted": ["#ffefd9", "#deb4333D"],

    // Border — navy-tinted
    "--color-border": ["#e6e9f2", "#FFFFFF1A"],
    "--color-border-emphasized": ["#ccd3e4", "#4e587a"],

    // Effects
    "--color-skeleton": ["#e6e9f2", "#4e587a"],
    "--color-shadow": ["#0b14301A", "#0000004D"],
    "--color-tint-hover": ["black", "white"],

    // =========================================================================
    // Categorical — kept verbatim from the Neutral theme (OKLCH-balanced
    // badge palette; see the Neutral theme source for the derivation notes).
    // =========================================================================

    // Red  H=22
    "--color-background-red": ["#facecb", "#ff9e973D"],
    "--color-border-red": ["#e6bab8", "#ff6f6c"],
    "--color-icon-red": ["#89001a", "#ff9e97"],
    "--color-text-red": ["#89001a", "#ffc6c1"],

    // Orange  H=55
    "--color-background-orange": ["#fad0b5", "#ffa2583D"],
    "--color-border-orange": ["#e6bda2", "#e2883e"],
    "--color-icon-orange": ["#6e3500", "#ffa258"],
    "--color-text-orange": ["#6e3500", "#ffc9a2"],

    // Yellow  H=90
    "--color-background-yellow": ["#f8da9d", "#deb4333D"],
    "--color-border-yellow": ["#e4c279", "#c0990e"],
    "--color-icon-yellow": ["#584400", "#deb433"],
    "--color-text-yellow": ["#584400", "#fdcf4f"],

    // Green  H=144
    "--color-background-green": ["#c5e5c0", "#84c9803D"],
    "--color-border-green": ["#b2d1ac", "#69ad67"],
    "--color-icon-green": ["#0c5700", "#84c980"],
    "--color-text-green": ["#0c5700", "#9fe59b"],

    // Teal  H=180
    "--color-background-teal": ["#a5e3d6", "#7ec6b83D"],
    "--color-border-teal": ["#94d6c8", "#63ab9d"],
    "--color-icon-teal": ["#005348", "#7ec6b8"],
    "--color-text-teal": ["#005348", "#99e2d3"],

    // Cyan  H=215
    "--color-background-cyan": ["#a3e0ef", "#83c2d43D"],
    "--color-border-cyan": ["#91d3e3", "#67a7b8"],
    "--color-icon-cyan": ["#00505f", "#83c2d4"],
    "--color-text-cyan": ["#00505f", "#9edef0"],

    // Blue  H=255
    "--color-background-blue": ["#c4ddfb", "#9eb7ff3D"],
    "--color-border-blue": ["#b1c9e7", "#6d9cfe"],
    "--color-icon-blue": ["#00458c", "#9eb7ff"],
    "--color-text-blue": ["#00458c", "#c7d3ff"],

    // Purple  H=320
    "--color-background-purple": ["#eccef3", "#f297ff3D"],
    "--color-border-purple": ["#d8bbdf", "#dd74f0"],
    "--color-icon-purple": ["#700084", "#f297ff"],
    "--color-text-purple": ["#700084", "#fac1ff"],

    // Pink  H=355
    "--color-background-pink": ["#fccadc", "#ff99c33D"],
    "--color-border-pink": ["#e7b7c8", "#f273aa"],
    "--color-icon-pink": ["#83004b", "#ff99c3"],
    "--color-text-pink": ["#83004b", "#ffc3da"],

    // Gray (categorical neutral) — navy-tinted ink ramp
    "--color-background-gray": ["#eceff6", "var(--color-neutral)"],
    "--color-border-gray": ["#ccd3e4", "#202a4d"],
    "--color-icon-gray": ["#4e587a", "#9aa4c0"],
    "--color-text-gray": ["#202a4d", "#e6e9f2"],

    // =========================================================================
    // Radius — controls 0.625rem / cards & containers 1rem (app convention)
    // =========================================================================
    "--radius-none": "0.25rem",
    "--radius-inner": "0.375rem",
    "--radius-element": "0.625rem",
    "--radius-container": "1rem",
    "--radius-page": "1.75rem",
    "--radius-full": "9999px",

    // =========================================================================
    // Shadows — the app's navy-tinted drops (rgba(11,20,48,…)), same
    // structure as the Neutral theme's light/dark split.
    // =========================================================================
    "--shadow-low":
      "0 1px 2px light-dark(rgba(11, 20, 48, 0.06), oklch(0 0 0 / 25%)), " +
      "0 4px 8px light-dark(rgba(11, 20, 48, 0.07), oklch(0 0 0 / 40%)), " +
      "inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 8%))",
    "--shadow-med":
      "0 4px 10px light-dark(rgba(11, 20, 48, 0.07), oklch(0 0 0 / 35%)), " +
      "0 2px 4px light-dark(rgba(11, 20, 48, 0.05), oklch(0 0 0 / 50%)), " +
      "inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 12%))",
    "--shadow-high":
      "0 10px 24px light-dark(rgba(11, 20, 48, 0.09), oklch(0 0 0 / 50%)), " +
      "0 4px 8px light-dark(rgba(11, 20, 48, 0.05), oklch(0 0 0 / 70%)), " +
      "inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 15%))",
    "--shadow-inset-hover": "inset 0px 0px 0px 2px #2f4a8f4D",
    "--shadow-inset-selected": "inset 0px 0px 0px 2px #2f4a8f80",
    "--shadow-inset-success": "inset 0px 0px 0px 2px #12a05f4D",
    "--shadow-inset-warning": "inset 0px 0px 0px 2px #fbc3124D",
    "--shadow-inset-error": "inset 0px 0px 0px 2px #e0413a4D",
  },

  components: {
    // =========================================================================
    // Button —
    //   primary: the Mắt Việt SIGNATURE CTA — gold bg + navy text (same in
    //     both modes; gold reads on light and dark alike).
    //   destructive: pastel error surface + error text (tokens above carry
    //     the app's danger family automatically).
    // =========================================================================
    button: {
      "variant:primary": {
        backgroundColor: "#fbc312",
        color: "#0b1430",
      },
      "variant:destructive": {
        backgroundColor: "var(--color-error-muted)",
        color: "var(--color-error)",
      },
    },

    // =========================================================================
    // Badge — semantic variants use the app's status families (filled,
    // contrasting text); categorical variants track the hue tokens.
    // =========================================================================
    badge: {
      "variant:info": {
        backgroundColor: "light-dark(#2f6fbf, #6d9cfe)",
        color: "light-dark(#ffffff, #11183a)",
      },
      "variant:neutral": {
        backgroundColor: "var(--color-background-gray)",
        color: "var(--color-text-gray)",
      },
      "variant:success": {
        backgroundColor: "light-dark(#12a05f, #64af4c)",
        color: "light-dark(#ffffff, #11183a)",
      },
      "variant:warning": {
        // Gold — the brand highlight doubles as the warning chip.
        backgroundColor: "#fbc312",
        color: "#11183a",
      },
      "variant:error": {
        backgroundColor: "light-dark(#e0413a, #ff705d)",
        color: "light-dark(#ffffff, #11183a)",
      },

      // Categorical — reference the per-hue tokens
      "variant:red": {
        backgroundColor: "var(--color-background-red)",
        color: "var(--color-text-red)",
      },
      "variant:orange": {
        backgroundColor: "var(--color-background-orange)",
        color: "var(--color-text-orange)",
      },
      "variant:yellow": {
        backgroundColor: "var(--color-background-yellow)",
        color: "var(--color-text-yellow)",
      },
      "variant:green": {
        backgroundColor: "var(--color-background-green)",
        color: "var(--color-text-green)",
      },
      "variant:teal": {
        backgroundColor: "var(--color-background-teal)",
        color: "var(--color-text-teal)",
      },
      "variant:cyan": {
        backgroundColor: "var(--color-background-cyan)",
        color: "var(--color-text-cyan)",
      },
      "variant:blue": {
        backgroundColor: "var(--color-background-blue)",
        color: "var(--color-text-blue)",
      },
      "variant:purple": {
        backgroundColor: "var(--color-background-purple)",
        color: "var(--color-text-purple)",
      },
      "variant:pink": {
        backgroundColor: "var(--color-background-pink)",
        color: "var(--color-text-pink)",
      },
      "variant:gray": {
        backgroundColor: "var(--color-background-gray)",
        color: "var(--color-text-gray)",
      },
    },

    // =========================================================================
    // Banner — hue-tinted surface + colored text/icon (kept from Neutral;
    // success/warning/error surfaces come from --color-X-muted, already
    // re-tokened to the app's status families above).
    // =========================================================================
    banner: {
      "status:info": {
        backgroundColor: "var(--color-background-blue)",
        "--color-accent-muted": "transparent",
        "--color-text-primary": "var(--color-text-blue)",
        "--color-text-secondary": "var(--color-text-blue)",
        "--color-accent": "var(--color-text-blue)",
      },
      "status:success": {
        "--color-text-primary": "var(--color-text-green)",
        "--color-text-secondary": "var(--color-text-green)",
        "--color-success": "var(--color-text-green)",
      },
      "status:warning": {
        "--color-text-primary": "var(--color-text-yellow)",
        "--color-text-secondary": "var(--color-text-yellow)",
        "--color-warning": "var(--color-text-yellow)",
      },
      "status:error": {
        "--color-text-primary": "var(--color-text-red)",
        "--color-text-secondary": "var(--color-text-red)",
        "--color-error": "var(--color-text-red)",
      },
    },

    // Switch / ProgressBar — off-state tracks share the lifted-neutral
    // channel treatment (kept from Neutral).
    switch: {
      base: {
        "--color-background-gray": "var(--color-border-emphasized)",
      },
    },

    progressbar: {
      base: {
        "--color-background-muted": "var(--color-border-emphasized)",
      },
      "variant:accent": {
        // Brand navy fill instead of Neutral's blue
        "--color-accent": "#2f4a8f",
      },
      "variant:success": {
        "--color-success": "#12a05f",
      },
      "variant:warning": {
        "--color-warning": "#fbc312",
      },
      "variant:error": {
        "--color-error": "#e0413a",
      },
    },

    // Card / Section — tighter padding (kept from Neutral)
    card: {
      base: {
        padding: "var(--spacing-3)",
      },
    },
    section: {
      base: {
        padding: "var(--spacing-3)",
      },
    },
  },

  icons: neutralIconRegistry,
});
