import type { ComponentType, ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/utils/cn";
import type { StatusTone } from "@/types/api";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-black tracking-tight text-[#102858]">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>{actions}</div>;
}

export function StatusBadge({ tone = "neutral", children }: { tone?: StatusTone; children: ReactNode }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize", toneClasses[tone])}>{children}</span>;
}

export function SearchToolbar({ value, onChange, placeholder = "Search...", children }: { value?: string; onChange?: (value: string) => void; placeholder?: string; children?: ReactNode }) {
  return <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center"><div className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>{children}</div>;
}

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="admin-table min-w-full">{children}</table></div>;
}

export function EmptyState({ label }: { label: string }) { return <div className="p-10 text-center text-sm text-slate-500">{label}</div>; }

export function IconStat({ label, value, icon: Icon, tone = "info" }: { label: string; value: ReactNode; icon: ComponentType<{ size?: number; className?: string }>; tone?: StatusTone }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", toneClasses[tone])}><Icon size={20} /></div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-[#102858]">{value}</p></div>;
}
