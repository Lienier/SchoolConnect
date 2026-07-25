/** Shared dashboard widgets reused across the four role dashboards. */
import { type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-navy-500 dark:text-navy-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-navy-800 dark:text-white">{value}</p>
    </Card>
  );
}

export function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: { label: string; to: string; icon?: ReactNode };
}) {
  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy-800 dark:text-white">{title}</h2>
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
}

export function QuickLink({ label, to, variant = "primary", icon }: QuickLinkProps) {
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