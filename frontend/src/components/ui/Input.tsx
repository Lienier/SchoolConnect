/** Text input field (shadcn/ui new-york style). */
import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 disabled:opacity-60 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100 dark:placeholder:text-navy-500 dark:focus-visible:ring-blue-700",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
