"use client";

import * as React from "react";
import { Check, ChevronDown, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { READINESS_DOT, READINESS_TEXT } from "@/lib/stage-visuals";
import type { Readiness } from "@/lib/validation/candidate";

export type RungState = "done" | "current" | "todo";

interface Props {
  icon: string;
  title: string;
  state: RungState;
  /** Entered-this-rung date line, right-aligned in the header. */
  meta?: string | null;
  /** One-line result recap — always visible on done/current rungs. */
  summary?: React.ReactNode;
  /** Readiness dot+label — shown on the current rung only. */
  readiness?: Readiness | null;
  /** Ghost description shown on todo rungs. */
  ghostText?: string;
  /** Rose "the journey ended here" band (rejected/withdrew). */
  exitBand?: React.ReactNode;
  /** True when this is the last rung — hides the connector tail. */
  last?: boolean;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  /** Action buttons pinned under the content of the current rung. */
  actionsSlot?: React.ReactNode;
}

/**
 * One rung of the candidate journey ladder (ADR 0019). Left column = the
 * rail (state marker + connector line); right = a card that expands in
 * place. Done rungs collapse to their summary; the current rung ships open.
 */
export function JourneyRung({
  icon,
  title,
  state,
  meta,
  summary,
  readiness,
  ghostText,
  exitBand,
  last,
  defaultOpen,
  children,
  actionsSlot,
}: Props) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  const expandable = state !== "todo" && (children != null || actionsSlot != null);

  return (
    <li className="relative flex gap-3">
      {/* Rail: marker + connector */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border text-base",
            state === "done" && "border-emerald-200 bg-emerald-50",
            state === "current" && "border-brand-900 bg-brand-900 shadow-md",
            state === "todo" && "border-slate-200 bg-white opacity-60",
          )}
          aria-hidden
        >
          {state === "done" ? (
            <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
          ) : (
            <span className={cn(state === "todo" && "grayscale")}>{icon}</span>
          )}
        </span>
        {!last ? (
          <span
            className={cn("w-px flex-1", state === "done" ? "bg-emerald-300" : "bg-slate-200")}
            aria-hidden
          />
        ) : null}
      </div>

      {/* Card */}
      <div className={cn("min-w-0 flex-1", !last && "pb-4")}>
        <div
          className={cn(
            "rounded-lg border bg-white",
            state === "current" && "border-brand-900/30 shadow-md ring-1 ring-brand-900/10",
            state === "done" && "border-slate-200",
            state === "todo" && "border-dashed border-slate-200 bg-slate-50/50",
          )}
        >
          {/* Header row — click toggles when expandable */}
          <button
            type="button"
            onClick={expandable ? () => setOpen((v) => !v) : undefined}
            disabled={!expandable}
            aria-expanded={expandable ? open : undefined}
            className={cn(
              "flex w-full items-start justify-between gap-3 px-4 py-3 text-left",
              expandable && "cursor-pointer transition-colors hover:bg-slate-50/70",
            )}
          >
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-bold uppercase tracking-wide",
                  state === "current" && "text-brand-900",
                  state === "done" && "text-slate-600",
                  state === "todo" && "text-slate-400",
                )}
              >
                {title}
              </p>
              {state === "current" && readiness ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs">
                  <span
                    className={cn("h-2 w-2 rounded-full", READINESS_DOT[readiness.tone])}
                    aria-hidden
                  />
                  <span className={cn("font-medium", READINESS_TEXT[readiness.tone])}>
                    {readiness.label}
                  </span>
                </p>
              ) : null}
              {summary ? (
                <div className="mt-1 text-sm text-slate-600" lang="vi">
                  {summary}
                </div>
              ) : null}
              {state === "todo" && ghostText ? (
                <p className="mt-1 text-xs text-slate-400">{ghostText}</p>
              ) : null}
            </div>
            <span className="flex shrink-0 items-center gap-2 pt-0.5">
              {meta ? <span className="text-xs text-slate-400">{meta}</span> : null}
              {expandable ? (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              ) : null}
            </span>
          </button>

          {/* Exit band (closed candidates) sits under the header, never collapsible */}
          {exitBand}

          {expandable && open ? (
            <div className="space-y-4 border-t border-slate-100 px-4 py-4">
              {children}
              {actionsSlot ? (
                <div className="border-t border-slate-100 pt-3">{actionsSlot}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** Rose/slate "journey ended here" strip for rejected/withdrew candidates. */
export function ExitBand({ label, tone }: { label: string; tone: "rejected" | "withdrew" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t px-4 py-2 text-xs font-medium",
        tone === "rejected"
          ? "border-rose-100 bg-rose-50 text-rose-700"
          : "border-slate-100 bg-slate-50 text-slate-600",
      )}
    >
      <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </div>
  );
}
