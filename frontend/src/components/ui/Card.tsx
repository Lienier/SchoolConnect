/** Card surface (shadcn/ui new-york style). */
import { type HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:text-navy-100 dark:shadow-none",
        className,
      )}
      {...props}
    />
  );
}
