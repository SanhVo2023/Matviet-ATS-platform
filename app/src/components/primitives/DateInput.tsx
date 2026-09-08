"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const WEEKDAY_FMT = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** "2026-09-08" → "Thứ Hai, 08/09/2026" (null when the string isn't a date). */
export function formatWeekdayDate(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return null;
  return WEEKDAY_FMT.format(d);
}

export interface DateInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  /** Hide the Vietnamese echo line (e.g. dense filter bars). */
  silent?: boolean;
}

/**
 * Native date picker (best on phones, no library) that echoes the choice as
 * a Vietnamese weekday + dd/MM/yyyy line — the OS picker shows locale-ish
 * dates, but chị Hương reads "Thứ Hai, 08/09/2026" and knows it's right.
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, silent, className, ...props }, ref) => {
    const echo = silent ? null : formatWeekdayDate(value);
    return (
      <div className={cn("min-w-0", className)}>
        <Input
          ref={ref}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 text-base md:text-sm"
          {...props}
        />
        {echo ? (
          <p className="mt-1 text-xs text-slate-500" aria-live="polite">
            {echo}
          </p>
        ) : null}
      </div>
    );
  },
);
DateInput.displayName = "DateInput";
