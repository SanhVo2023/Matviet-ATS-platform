/**
 * Canonical brand hexes for surfaces Tailwind classes can't reach — email
 * HTML, the react-pdf report, exceljs fills, the QR poster canvas. Values
 * MUST mirror tailwind.config.ts (brand/accent/slate scales); in React
 * components always use Tailwind classes instead of these constants.
 *
 * No "server-only" import on purpose: email layout builds run in vitest and
 * the QR poster renders client-side.
 */
export const BRAND = {
  navy: "#0b1430", // brand-900 — chrome / headers
  navyMid: "#1d3061", // brand-700
  primary: "#2f4a8f", // brand-500 — interactive
  gold: "#fbc312", // accent-400 — the signature
  goldTint: "#fce78d", // accent-200
  ink: "#11183a", // slate-900 — body text
  inkMuted: "#667192", // slate-500 — secondary text
  inkFaint: "#9aa4c0", // slate-400 — decorative only (fails AA as text)
  border: "#e6e9f2", // slate-200
  surface: "#f3f5fa", // slate-50 — page ground
  white: "#ffffff",
  success: "#12a05f",
  successFg: "#0b6e41",
  successBg: "#dcf5e9",
  warning: "#ef7a00",
  danger: "#e0413a",
} as const;

/** exceljs wants ARGB. */
export const BRAND_ARGB = {
  navy: "FF0B1430",
  gold: "FFFBC312",
  white: "FFFFFFFF",
} as const;
