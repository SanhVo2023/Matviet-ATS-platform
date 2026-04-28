import type { Config } from "tailwindcss";

/**
 * Mắt Việt HR — design tokens
 * - Brand colors (logo-adjacent surfaces only): brand-navy + brand-yellow
 * - Interactive UI: primary blue scale (Tailwind blue, lighter than brand-navy)
 * - Action / urgency: accent amber scale
 * - Stage badges: explicit per-stage tokens for the 16 pipeline_stage values
 * - Semantic: success / warning / error / info
 *
 * Brand vs UI separation per docs/ui-ux.md §2:
 *   brand-navy / brand-yellow → sidebar bg, login hero, OG image, email header
 *   primary / accent → buttons, links, focus rings, status badges (UI affordances)
 */
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

        // Brand — match the actual MV1-MV6 PNG values (logo-adjacent surfaces only)
        brand: {
          navy: "#13245C",
          yellow: "#FFC107",
        },

        // Primary — interactive UI (Tailwind blue scale; lighter than brand-navy)
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },

        // Accent — warm amber for CTAs + urgency badges (NOT brand-yellow which is reserved for logo)
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },

        // Semantic
        success: {
          DEFAULT: "#059669",
          fg: "#065F46",
          bg: "#D1FAE5",
        },
        warning: {
          DEFAULT: "#D97706",
          fg: "#92400E",
          bg: "#FEF3C7",
        },
        error: {
          DEFAULT: "#DC2626",
          fg: "#991B1B",
          bg: "#FEE2E2",
        },
        info: {
          DEFAULT: "#0284C7",
          fg: "#075985",
          bg: "#E0F2FE",
        },

        // Stage badges — covers all 16 pipeline_stage enum values
        stage: {
          new: { bg: "#F1F5F9", fg: "#334155" },
          screening: { bg: "#DBEAFE", fg: "#1D4ED8" },
          screened: { bg: "#DBEAFE", fg: "#1D4ED8" },
          interview: { bg: "#FEF3C7", fg: "#92400E" },
          test: { bg: "#EDE9FE", fg: "#5B21B6" },
          recommended: { bg: "#E0E7FF", fg: "#3730A3" },
          salary: { bg: "#E0E7FF", fg: "#3730A3" },
          bod: { bg: "#E0E7FF", fg: "#3730A3" },
          tap_doan: { bg: "#E0E7FF", fg: "#3730A3" },
          offer: { bg: "#D1FAE5", fg: "#065F46" },
          hired: { bg: "#059669", fg: "#FFFFFF" },
          rejected: { bg: "#FFE4E6", fg: "#9F1239" },
          withdrew: { bg: "#F4F4F5", fg: "#52525B" },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Per docs/ui-ux.md §5
        sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
        md: "0 4px 6px rgba(15, 23, 42, 0.07), 0 2px 4px rgba(15, 23, 42, 0.06)",
        lg: "0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.05)",
        xl: "0 20px 25px rgba(15, 23, 42, 0.1), 0 10px 10px rgba(15, 23, 42, 0.04)",
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
