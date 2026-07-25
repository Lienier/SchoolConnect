import { cn } from "@/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = "text", width, height, ...props }: SkeletonProps) {
  const baseStyles = "animate-pulse rounded bg-navy-100 dark:bg-navy-800";
  const variantStyles = {
    text: "h-4",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{ width, height }}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className, ...props }: { lines?: number } & SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("rounded-2xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-950 p-6 shadow-soft dark:shadow-none space-y-4", className)} {...props}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={120} />
      <div className="flex gap-2">
        <Skeleton variant="text" width={80} height={36} className="rounded-xl" />
        <Skeleton variant="text" width={80} height={36} className="rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className, ...props }: { rows?: number; columns?: number } & SkeletonProps) {
  return (
    <div className={cn("rounded-2xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-950 shadow-soft dark:shadow-none overflow-hidden", className)} {...props}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-navy-100 dark:border-navy-800 bg-navy-50 dark:bg-navy-900">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton variant="text" width="80%" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton variant="text" width="80%" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5, className, ...props }: { items?: number } & SkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-950">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 4, className, ...props }: { fields?: number } & SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="rectangular" height={44} className="rounded-xl" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton variant="rectangular" width={120} height={44} className="rounded-xl" />
        <Skeleton variant="rectangular" width={120} height={44} className="rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = "md", className, ...props }: { size?: "sm" | "md" | "lg" | "xl" } & SkeletonProps) {
  const sizes = { sm: 32, md: 40, lg: 48, xl: 56 };
  return <Skeleton variant="circular" width={sizes[size]} height={sizes[size]} className={className} {...props} />;
}

export function SkeletonButton({ size = "md", className, ...props }: { size?: "sm" | "md" | "lg" } & SkeletonProps) {
  const sizes = { sm: { h: 36, w: 80 }, md: { h: 44, w: 100 }, lg: { h: 48, w: 120 } };
  return <Skeleton variant="rectangular" width={sizes[size].w} height={sizes[size].h} className={cn("rounded-xl", className)} {...props} />;
}