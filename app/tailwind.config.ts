import type { Config } from "tailwindcss";

/**
 * Mắt Việt HR — design tokens (v2, shared design language with the Mắt Việt
 * voucher-wallet app; see docs/design-language.md).
 *
 * - brand: navy scale, 500 #2f4a8f → 900 #0b1430. Navy chrome = brand-900.
 * - accent: gold, signature value accent-400 #fbc312.
 *   The SIGNATURE CTA is gold bg + navy text (bg-accent-400 text-brand-900).
 * - slate: OVERRIDDEN with a navy-tinted ink ramp so the whole app sits on
 *   the premium surface/ink/border palette without per-class rewrites:
 *     slate-50 = surface #f3f5fa · slate-200 = border #e6e9f2
 *     slate-500 = ink-muted #667192 · slate-900 = ink #11183a
 * - primary: interactive scale = the brand navy-blue (buttons/links/rings).
 * - radius: cards 1rem (rounded-lg), controls 0.625rem (rounded-md).
 */

const brandScale = {
  50: "#eef2fb",
  100: "#dde5f6",
  200: "#bccbed",
  300: "#93a9de",
  400: "#5f7cc0",
  500: "#2f4a8f",
  600: "#263d78",
  700: "#1d3061",
  800: "#14224a",
  900: "#0b1430",
  950: "#070d20",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-be-vietnam-pro)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        // shadcn/ui CSS variable bridge (consumed by ui/* components)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // Brand navy scale + chrome aliases
        brand: {
          ...brandScale,
          navy: brandScale[900],
          yellow: "#fbc312",
        },

        // Primary — interactive UI = brand navy-blue
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          ...brandScale,
        },

        // Accent — GOLD. accent-400 is the signature.
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50: "#fefbeb",
          100: "#fdf3c4",
          200: "#fce78d",
          300: "#fcd54d",
          400: "#fbc312",
          500: "#e2ab04",
          600: "#c38d02",
          700: "#9c6a06",
        },

        // Navy-tinted ink neutrals (overrides Tailwind slate globally)
        slate: {
          50: "#f3f5fa",
          100: "#eceff6",
          200: "#e6e9f2",
          300: "#ccd3e4",
          400: "#9aa4c0",
          500: "#667192",
          600: "#4e587a",
          700: "#39425f",
          800: "#202a4d",
          900: "#11183a",
          950: "#0b1430",
        },

        // Direct tokens for new components
        surface: { DEFAULT: "#f3f5fa", raised: "#ffffff" },
        ink: { DEFAULT: "#11183a", muted: "#667192" },

        // Semantic
        success: {
          DEFAULT: "#12a05f",
          fg: "#0b6e41",
          bg: "#dcf5e9",
        },
        warning: {
          DEFAULT: "#ef7a00",
          fg: "#9a4e00",
          bg: "#ffefd9",
        },
        error: {
          DEFAULT: "#e0413a",
          fg: "#a02722",
          bg: "#fde3e2",
        },
        danger: {
          DEFAULT: "#e0413a",
          fg: "#a02722",
          bg: "#fde3e2",
        },
        info: {
          DEFAULT: "#2f6fbf",
          fg: "#1e4e8c",
          bg: "#e0ecfb",
        },

        // Stage badges — navy-family tints for the 16 pipeline_stage values
        stage: {
          new: { bg: "#eceff6", fg: "#39425f" },
          screening: { bg: "#dde5f6", fg: "#1d3061" },
          screened: { bg: "#dde5f6", fg: "#1d3061" },
          interview: { bg: "#fdf3c4", fg: "#9c6a06" },
          test: { bg: "#ede9fe", fg: "#5b21b6" },
          recommended: { bg: "#dde5f6", fg: "#263d78" },
          salary: { bg: "#dde5f6", fg: "#263d78" },
          bod: { bg: "#dde5f6", fg: "#263d78" },
          tap_doan: { bg: "#dde5f6", fg: "#263d78" },
          offer: { bg: "#dcf5e9", fg: "#0b6e41" },
          hired: { bg: "#12a05f", fg: "#FFFFFF" },
          rejected: { bg: "#fde3e2", fg: "#a02722" },
          withdrew: { bg: "#eceff6", fg: "#667192" },
        },
      },
      borderRadius: {
        lg: "1rem", // radius-card
        md: "0.625rem", // controls
        sm: "0.5rem",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(11, 20, 48, 0.06)",
        md: "0 4px 10px rgba(11, 20, 48, 0.07), 0 2px 4px rgba(11, 20, 48, 0.05)",
        lg: "0 10px 24px rgba(11, 20, 48, 0.09), 0 4px 8px rgba(11, 20, 48, 0.05)",
        xl: "0 20px 40px rgba(11, 20, 48, 0.12), 0 10px 12px rgba(11, 20, 48, 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "accordion-up": "accordion-up 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in": "fade-in 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-right": "slide-in-right 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        shimmer: "shimmer 1.5s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
