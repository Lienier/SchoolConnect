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

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("mb-4 space-y-1.5", className)} {...props} />; }
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) { return <h3 className={cn("text-lg font-semibold", className)} {...props} />; }
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("text-sm text-slate-600 dark:text-navy-300", className)} {...props} />; }
export function CardContent(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} />; }
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("mt-4 flex items-center", className)} {...props} />; }
