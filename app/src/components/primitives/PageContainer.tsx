import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * THE page container (renovation C-2b). Four widths, one padding rhythm —
 * tighter on phones (16px), wider on desktops (32px) — so every route lines
 * up with the sidebar and the header instead of picking its own margins.
 *
 *  wide    1400px  data-dense (reports, email queue, audit log)
 *  default 7xl     lists + dashboards
 *  detail  5xl     one record (candidate, employee, job)
 *  narrow  3xl     queues, forms, help, single-column pages
 */
const SIZE = {
  wide: "max-w-[1400px]",
  default: "max-w-7xl",
  detail: "max-w-5xl",
  narrow: "max-w-3xl",
} as const;

export type PageContainerSize = keyof typeof SIZE;

export function PageContainer({
  size = "default",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { size?: PageContainerSize }) {
  return (
    <div
      className={cn("mx-auto w-full px-4 py-5 md:px-6 md:py-6 lg:px-8", SIZE[size], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
