/** Shared dashboard widgets reused across role dashboards. */
import { type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/utils/cn";

type StatTone = "blue" | "green" | "amber" | "violet";

const statTones: Record<StatTone, string> = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  violet: "bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-navy-200",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ size?: number }>;
  tone?: StatTone;
  hint?: string;
}) {
  return (
    <Card className="border-slate-200 p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-navy-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-navy-900 dark:text-white">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500 dark:text-navy-400">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", statTones[tone])}>
            <Icon size={21} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function SectionCard({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: ReactNode;
  action?: { label: string; to: string; icon?: ReactNode };
  className?: string;
}) {
  return (
    <Card className={cn("border-slate-200 p-6 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-navy-900 dark:text-white">{title}</h2>
        {action && (
          <Link to={action.to} className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">
            {action.icon}
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

interface QuickLinkProps {
  label: string;
  to: string;
  variant?: "primary" | "secondary";
  icon?: ReactNode;
  perm?: string;
  disabled?: boolean;
}

export function QuickLink({ label, to, variant = "primary", icon, perm, disabled = false }: QuickLinkProps) {
  const { can } = usePermissions();
  if (perm && !can(perm)) return null;
  if (disabled) {
    return (
      <span
        title="This feature is not available yet"
        aria-disabled="true"
        className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-500"
      >
        {icon}
        {label}
        <span className="text-[10px]">Unavailable</span>
      </span>
    );
  }
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
        variant === "primary"
          ? "bg-navy-800 text-white hover:bg-navy-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          : "border border-slate-200 bg-white text-navy-800 hover:bg-slate-50 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100 dark:hover:bg-navy-800",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
