/** Primary action button (shadcn/ui new-york style). */
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-navy-800 text-white hover:bg-navy-700 disabled:opacity-60",
  secondary:
    "bg-white text-navy-800 border border-navy-200 hover:bg-navy-50 disabled:opacity-60",
  ghost: "bg-transparent text-navy-700 hover:bg-navy-50",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:opacity-60",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {isLoading ? "Loading…" : children}
      </button>
    );
  },
);

Button.displayName = "Button";
