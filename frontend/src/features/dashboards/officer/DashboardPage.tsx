/** Student Council Officer dashboard: proposals, drafts, pending approvals. */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Megaphone, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconStat } from "@/components/ui/AdminPrimitives";
import { BulletinFeed } from "@/features/announcements/components/BulletinFeed";
import { dashboardApi } from "@/features/dashboard/services/dashboardApi";

export default function OfficerDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats", "officer"],
    queryFn: () => dashboardApi.stats(["my_events", "pending_approvals", "draft_announcements"]),
  });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">Student Council</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102858] dark:text-white">
              Council workspace
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-navy-300">
              Propose events, draft announcements, and follow submissions through school review.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/events/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Propose event
                </Button>
              </Link>
              <Link to="/announcements">
                <Button variant="secondary">
                  <Megaphone className="mr-2 h-4 w-4" />
                  Announcements
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-slate-200 bg-slate-50 dark:border-navy-800 dark:bg-navy-900 lg:border-l lg:border-t-0">
            <Metric label="My Events" value={isLoading ? "..." : (stats?.my_events ?? 0)} />
            <Metric label="Pending" value={isLoading ? "..." : (stats?.pending_approvals ?? 0)} />
            <Metric label="Drafts" value={isLoading ? "..." : (stats?.draft_announcements ?? 0)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <IconStat label="My Events" value={isLoading ? "..." : (stats?.my_events ?? 0)} icon={CalendarDays} />
        <IconStat label="Pending Approvals" value={isLoading ? "..." : (stats?.pending_approvals ?? 0)} icon={ClipboardList} tone="warning" />
        <IconStat label="Draft Announcements" value={isLoading ? "..." : (stats?.draft_announcements ?? 0)} icon={Megaphone} tone="info" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-[#102858] dark:text-white">Planning</h2>
            <Link to="/events/new" className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">
              Propose event
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionLink icon={Plus} label="Propose Event" to="/events/new" />
            <ActionLink icon={CalendarDays} label="My Events" to="/events" />
            <ActionLink icon={Megaphone} label="Draft Announcements" to="/announcements" />
            <ActionLink icon={ClipboardList} label="My Registrations" to="/registrations/mine" />
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
          <h2 className="font-semibold text-[#102858] dark:text-white">Discover</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionLink icon={CalendarDays} label="Browse Events" to="/events" />
            <ActionLink icon={Megaphone} label="Announcements" to="/announcements" />
          </div>
        </Card>
      </div>

      <BulletinFeed
        title="Council bulletin"
        description="A feed-style view of updates, approvals, and upcoming school events."
        compact
        showHero={false}
        showHeader={false}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-r border-slate-200 p-4 text-center last:border-r-0 dark:border-navy-800 sm:p-5 lg:flex lg:flex-col lg:justify-center">
      <p className="text-2xl font-semibold text-[#102858] dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-navy-400">{label}</p>
    </div>
  );
}

function ActionLink({ icon: Icon, label, to }: { icon: typeof CalendarDays; label: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold text-[#102858] dark:text-white">{label}</span>
    </Link>
  );
}
