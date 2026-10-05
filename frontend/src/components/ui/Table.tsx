/** Lightweight table primitives (shadcn/ui new-york style). */
import { type ReactNode, type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
      <table className={cn("w-full text-left text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-400">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 dark:divide-navy-800">{children}</tbody>;
}

export function TR({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cn("hover:bg-slate-50/70 dark:hover:bg-navy-900/70", className)}>{children}</tr>;
}

export function TH({ children, className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function TD({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cn("px-4 py-3 text-slate-700 dark:text-navy-200", className)}>{children}</td>;
}
