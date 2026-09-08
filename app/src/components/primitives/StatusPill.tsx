import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * THE status pill. Every "state as a small rounded label" in the app renders
 * through this (employee/contract/leave/scoring/approval…), so one tone means
 * one thing everywhere: success = done/active, warning = waiting/expiring,
 * error = failed/rejected, info = in progress, neutral = inactive/cancelled.
 */
const pill = cva(
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-slate-100 text-slate-700",
        success: "bg-success-bg text-success-fg",
        warning: "bg-warning-bg text-warning-fg",
        error: "bg-error-bg text-error-fg",
        info: "bg-info-bg text-info-fg",
        brand: "bg-brand-50 text-brand-900",
        accent: "bg-accent-100 text-brand-900",
      },
      size: {
        sm: "h-5 px-2 text-2xs",
        md: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export type PillTone = NonNullable<VariantProps<typeof pill>["tone"]>;

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof pill> {
  /** Leading dot in the text colour — for lists where the label is scanned. */
  dot?: boolean;
  icon?: LucideIcon;
}

export function StatusPill({
  tone,
  size,
  dot,
  icon: Icon,
  className,
  children,
  ...rest
}: StatusPillProps) {
  return (
    <span className={cn(pill({ tone, size }), className)} {...rest}>
      {Icon ? (
        <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />
      ) : dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
