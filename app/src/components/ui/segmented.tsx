"use client";

/**
 * Segmented — the SIGNATURE "tab slicer" (design-language §4.4).
 * A gold pill slides between options via framer-motion shared layout.
 * Every instance MUST have a unique `id` (the layoutId namespace).
 */
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedProps<T extends string> {
  /** Unique per instance — namespaces the shared-layout pill. */
  id: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

export function Segmented<T extends string>({
  id,
  options,
  value,
  onChange,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SegmentedProps<T>) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-1 rounded-full bg-slate-100 p-1", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-full font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-500",
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
              active ? "text-brand-900" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-pill-${id}`}
                className="absolute inset-0 rounded-full bg-accent-400 shadow-sm"
                transition={
                  reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }
                }
                aria-hidden
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
