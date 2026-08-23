/** Shared dashboard widgets reused across the four role dashboards. */
import { type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";
import { usePermissions } from "@/hooks/usePermissions";

export function StatCard({ label, value, icon: Icon, tone = "blue", hint }: { label: string; value: ReactNode; icon?: ComponentType<{ size?: number }>; tone?: "blue" | "green" | "amber" | "violet"; hint?: string }) {
  const toneClasses = { blue: "bg-blue-100 text-blue-700", green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", violet: "bg-violet-100 text-violet-700" };
  return (
    <Card className="border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-[#102858]">{value}</p>{hint && <p className="mt-2 text-xs text-emerald-600">{hint}</p>}</div>
        {Icon && <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", toneClasses[tone])}><Icon size={23} /></div>}
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
    <Card className={cn("border-slate-200 p-6 shadow-sm", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-[#102858] dark:text-white">{title}</h2>
        {action && (
          <Link to={action.to} className="flex items-center gap-1 text-sm font-medium text-navy-700 dark:text-navy-300 hover:underline">
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
    return <span title="This feature is not available yet" aria-disabled="true" className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400">{icon}{label} <span className="text-[10px]">Unavailable</span></span>;
  }
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
        variant === "primary"
          ? "bg-navy-800 text-white hover:bg-navy-700 dark:bg-primary dark:hover:bg-primary/90"
          : "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100 dark:hover:bg-navy-800",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
