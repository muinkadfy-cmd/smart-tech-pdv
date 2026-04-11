import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="app-table-shell scrollbar-hidden relative w-full overflow-auto rounded-[20px] border border-[rgba(201,168,111,0.14)] bg-[linear-gradient(180deg,rgba(34,39,49,0.98),rgba(24,28,36,0.985))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_36px_-30px_rgba(0,0,0,0.48)]">
      <table ref={ref} className={cn("min-w-full caption-bottom text-[13px]", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        "sticky top-0 z-[1] bg-[linear-gradient(180deg,rgba(42,47,58,0.98),rgba(33,37,46,0.98))] backdrop-blur [&_tr]:border-b [&_tr]:border-[rgba(201,168,111,0.12)]",
        className
      )}
      {...props}
    />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-[rgba(201,168,111,0.10)] transition-all duration-200 odd:bg-white/[0.01] hover:bg-[rgba(201,168,111,0.06)]",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("app-table-head h-10 px-3.5 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]", className)}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => <td ref={ref} className={cn("app-table-cell px-3.5 py-3 align-middle text-slate-200", className)} {...props} />
);
TableCell.displayName = "TableCell";
