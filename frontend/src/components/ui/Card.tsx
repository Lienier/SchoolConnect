/** Card surface (shadcn/ui new-york style). */
import { type HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-navy-100 bg-white p-8 shadow-soft dark:border-navy-800 dark:bg-navy-950 dark:shadow-none",
        className,
      )}
      {...props}
    />
  );
}
