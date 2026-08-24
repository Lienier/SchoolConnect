/** Professor dashboard: own events, rosters, attendance, and announcements. */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Megaphone,
  Plus,
  QrCode,
} from "lucide-react";

import { BulletinFeed } from "@/features/announcements/components/BulletinFeed";
import { useAuth } from "@/features/auth/context/AuthContext";
import { dashboardApi } from "@/features/dashboard/services/dashboardApi";
import { eventsApi } from "@/features/events/services/eventsApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/AdminPrimitives";

const statusLabels: Record<string, string> = {
  draft: "Drafts",
  pending_approval: "Pending Approval",
  approved: "Open",
  ongoing: "Live",
  completed: "Completed",
};

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats", "professor"],
    queryFn: () => dashboardApi.stats(["active_events", "open_registrations", "pending_event_approvals"]),
  });
  const ownEvents = useQuery({
    queryKey: ["professor", "events", user?.id],
    queryFn: () => eventsApi.list({ page: 1, organizer_id: user?.id }),
    enabled: Boolean(user?.id),
  });

  const grouped = useMemo(() => {
    const groups: Record<string, number> = {
      draft: 0,
      pending_approval: 0,
      approved: 0,
      ongoing: 0,
      completed: 0,
    };
    for (const event of ownEvents.data?.data ?? []) {
      if (event.status in groups) groups[event.status] += 1;
    }
    return groups;
  }, [ownEvents.data?.data]);
  const nextEvent = (ownEvents.data?.data ?? [])
    .filter((event) => ["approved", "ongoing"].includes(event.status))
    .sort((a, b) => String(a.start_time ?? "").localeCompare(String(b.start_time ?? "")))[0];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
        <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
              Professor Console
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102858] dark:text-white">
              Welcome back, Professor {user?.last_name ?? user?.full_name?.split(" ").slice(-1)[0] ?? ""}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-navy-300">
              Manage your event proposals, rosters, QR check-ins, attendance records, and student announcements.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/events/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create event
                </Button>
              </Link>
              <Link to="/attendance">
                <Button variant="secondary">
                  <QrCode className="mr-2 h-4 w-4" />
                  Attendance
                </Button>
              </Link>
              <Link to="/announcements/new">
                <Button variant="secondary">
                  <Megaphone className="mr-2 h-4 w-4" />
                  New announcement
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-slate-200 bg-slate-50 dark:border-navy-800 dark:bg-navy-900 xl:border-l xl:border-t-0">
            <Metric label="Active Events" value={isLoading ? "..." : (stats?.active_events ?? 0)} />
            <Metric label="Open Rosters" value={isLoading ? "..." : (stats?.open_registrations ?? 0)} />
            <Metric label="Pending Review" value={isLoading ? "..." : (stats?.pending_event_approvals ?? 0)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-[#102858] dark:text-white">My event pipeline</h2>
            <Link to="/events" className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">Manage events</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {Object.entries(grouped).map(([status, count]) => (
              <div key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center dark:border-navy-800 dark:bg-navy-900">
                <p className="text-2xl font-semibold text-[#102858] dark:text-white">{ownEvents.isLoading ? "..." : count}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-navy-400">{statusLabels[status]}</p>
              </div>
            ))}
          </div>
          {nextEvent && (
            <Link to={`/events/${nextEvent.id}`} className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-900">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#102858] dark:text-white">{nextEvent.title}</span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-navy-400">{nextEvent.start_time ? new Date(nextEvent.start_time).toLocaleString() : "Schedule TBD"}</span>
              </span>
              <StatusBadge tone={nextEvent.status === "ongoing" ? "info" : "success"}>{nextEvent.status}</StatusBadge>
            </Link>
          )}
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
          <h2 className="font-semibold text-[#102858] dark:text-white">Today's tools</h2>
          <div className="mt-4 grid gap-3">
            <QuickAction icon={ClipboardList} label="Open roster" to={nextEvent ? `/events/${nextEvent.id}` : "/events"} />
            <QuickAction icon={ClipboardCheck} label="Mark attendance" to="/attendance" />
            <QuickAction icon={CalendarDays} label="Calendar" to="/calendar" />
          </div>
        </Card>
      </section>

      <BulletinFeed
        title="Professor bulletin"
        description="Published announcements and approved events for the school community."
        compact
        showHero={false}
        showHeader={false}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-r border-slate-200 p-4 text-center last:border-r-0 dark:border-navy-800 sm:p-5 xl:flex xl:flex-col xl:justify-center">
      <p className="text-2xl font-semibold text-[#102858] dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-navy-400">{label}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to }: { icon: typeof CalendarDays; label: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold text-[#102858] dark:text-white">{label}</span>
    </Link>
  );
}
