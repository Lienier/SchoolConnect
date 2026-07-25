import { cn } from "@/utils/cn";

export function Container({ className, children, size = "xl" }: { className?: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" | "full" }) {
  const maxWidths = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-7xl",
    xl: "max-w-[1440px]",
    full: "max-w-full",
  };

  return (
    <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", maxWidths[size], className)}>
      {children}
    </div>
  );
}

export function Divider({ className, orientation = "horizontal", decorative = true }: { className?: string; orientation?: "horizontal" | "vertical"; decorative?: boolean }) {
  return (
    <hr
      className={cn(
        "bg-navy-100 border-0",
        orientation === "horizontal" ? "w-full h-px" : "h-full w-px",
        decorative ? "" : "aria-hidden",
        className
      )}
      role={decorative ? "separator" : undefined}
      aria-orientation={orientation}
    />
  );
}

export function ScrollArea({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div className={cn("overflow-auto scrollbar-thin scrollbar-track-navy-50 scrollbar-thumb-navy-200", className)} {...props}>
      {children}
    </div>
  );
}

export function Stack({ className, children, direction = "vertical", spacing = 4, wrap = false, align, justify, ...props }: {
  className?: string;
  children: React.ReactNode;
  direction?: "vertical" | "horizontal";
  spacing?: number;
  wrap?: boolean;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
} & React.HTMLAttributes<HTMLDivElement>) {
  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
  };

  return (
    <div
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        wrap && "flex-wrap",
        `gap-${spacing}`,
        align && alignClasses[align],
        justify && justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Grid({ className, children, cols = 1, gap = 4, responsive = true, ...props }: {
  className?: string;
  children: React.ReactNode;
  cols?: number;
  gap?: number;
  responsive?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  const responsiveCols = responsive
    ? `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols}`
    : `grid-cols-${cols}`;

  return (
    <div
      className={cn(
        "grid",
        responsiveCols,
        `gap-${gap}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AspectRatio({ className, children, ratio = "16/9", ...props }: { className?: string; children: React.ReactNode; ratio?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: ratio }} {...props}>
      {children}
    </div>
  );
}

export function Separator({ className, orientation = "horizontal", decorative = true }: { className?: string; orientation?: "horizontal" | "vertical"; decorative?: boolean }) {
  return (
    <div
      className={cn(
        "bg-navy-100",
        orientation === "horizontal" ? "w-full h-px" : "h-full w-px",
        className
      )}
      role={decorative ? "separator" : undefined}
      aria-orientation={orientation}
    />
  );
}