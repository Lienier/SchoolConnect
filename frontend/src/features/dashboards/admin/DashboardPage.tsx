/** Administrator dashboard: system-wide stats, management shortcuts, audit. */
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { dashboardApi } from "@/features/dashboard/services/dashboardApi";
import { SectionCard, StatCard } from "@/features/dashboards/shared/widgets";
import { Skeleton } from "@/components/ui/Skeleton";
import { CalendarDays, ClipboardList, FileCheck2, Megaphone, Users } from "lucide-react";

const WIDGETS: { key: string; label: string }[] = [
  { key: "total_users", label: "Total Users" },
  { key: "total_students", label: "Students" },
  { key: "active_events", label: "Active Events" },
  { key: "total_announcements", label: "Announcements" },
  { key: "pending_event_approvals", label: "Pending Event Approvals" },
  { key: "pending_announcement_approvals", label: "Pending Announcements" },
  { key: "open_registrations", label: "Open Registrations" },
];

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.stats(),
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Overview</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102858]">Good morning! <span aria-hidden>👋</span></h1><p className="mt-2 text-sm text-slate-500">Here&apos;s what&apos;s happening with your school community today.</p></div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">Today&apos;s overview</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {WIDGETS.map((w) => (
          <StatCard
            key={w.key}
            label={w.label}
            value={isLoading ? <Skeleton variant="rectangular" height={36} className="mt-1 w-2/3" /> : (stats?.[w.key] ?? 0)}
            icon={w.key.includes("users") || w.key.includes("students") ? Users : w.key.includes("events") ? CalendarDays : w.key.includes("registrations") ? ClipboardList : FileCheck2}
            tone={w.key.includes("pending") ? "amber" : w.key.includes("events") ? "green" : "blue"}
            hint="Live from system"
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Pending approvals" action={{ label: "View all", to: "/approvals" }}>
          <div className="space-y-3"><ApprovalRow icon={<Megaphone size={18} />} title="Announcements awaiting review" value={stats?.pending_announcement_approvals ?? 0} /><ApprovalRow icon={<CalendarDays size={18} />} title="Events awaiting review" value={stats?.pending_event_approvals ?? 0} /></div>
        </SectionCard>
      </div>
    </div>
  );
}

function ApprovalRow({ icon, title, value }: { icon: ReactNode; title: string; value: ReactNode }) { return <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">{icon}</span><span className="flex-1 text-sm font-semibold text-slate-700">{title}</span><span className="text-lg font-bold text-[#102858]">{value}</span></div>; }
