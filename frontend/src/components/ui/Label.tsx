/** Form label (shadcn/ui new-york style). */
import { type LabelHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-navy-800", className)}
      {...props}
    />
  );
}
