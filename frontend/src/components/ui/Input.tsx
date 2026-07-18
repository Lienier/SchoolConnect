/** Text input field (shadcn/ui new-york style). */
import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl border border-navy-200 bg-white px-4 text-sm text-navy-900 placeholder:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
