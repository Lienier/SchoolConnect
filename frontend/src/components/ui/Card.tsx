/** Card surface (shadcn/ui new-york style). */
import { type HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-navy-100 bg-white p-8 shadow-soft",
        className,
      )}
      {...props}
    />
  );
}
