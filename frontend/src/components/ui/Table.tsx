/** Lightweight table primitives (shadcn/ui new-york style). */
import { type ReactNode } from "react";

import { cn } from "@/utils/cn";

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white shadow-soft">
      <table className={cn("w-full text-left text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-navy-100 bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-navy-50">{children}</tbody>;
}

export function TR({ className, children }: { className?: string; children: ReactNode }) {
  return <tr className={cn("hover:bg-navy-50/50", className)}>{children}</tr>;
}

export function TH({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

export function TD({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn("px-4 py-3 text-navy-800", className)}>{children}</td>;
}
