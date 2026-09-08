import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn-style table parts with the app's one table look (renovation C-2g):
 * slate-50 uppercase header, hairline rows, 16px cell padding, and — always —
 * horizontal scrolling inside the table, never the page. `TableFrame` is the
 * rounded white card most list tables sit in. For sortable/paginated data use
 * `primitives/DataTable`; these parts are for plain lists.
 */
const TableFrame = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white", className)}
      {...props}
    />
  ),
);
TableFrame.displayName = "TableFrame";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 [&_tr]:border-b [&_tr]:border-slate-200",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("border-b border-slate-100", className)} {...props} />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("h-10 whitespace-nowrap px-4 py-2.5 align-middle font-semibold", className)}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-4 py-3 align-middle", className)} {...props} />
));
TableCell.displayName = "TableCell";

export { TableFrame, Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
