/** Student dashboard: social feed, quick actions, and personal college activity. */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  QrCode,
  UserRound,
} from "lucide-react";

import { BulletinFeed } from "@/features/announcements/components/BulletinFeed";
import { useAuth } from "@/features/auth/context/AuthContext";
import { dashboardApi } from "@/features/dashboard/services/dashboardApi";
import { eventsApi } from "@/features/events/services/eventsApi";
import { attendanceApi } from "@/features/attendance/services/attendanceApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/AdminPrimitives";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats", "student"],
    queryFn: () => dashboardApi.stats(["upcoming_events", "my_registrations", "notifications"]),
  });
  const upcoming = useQuery({
    queryKey: ["student-dashboard", "events"],
    queryFn: () => eventsApi.list({ page: 1, status: "approved" }),
  });
  const attendance = useQuery({
    queryKey: ["student-dashboard", "attendance"],
    queryFn: () => attendanceApi.mine(1),
  });

  const nextEvents = (upcoming.data?.data ?? []).slice(0, 3);
  const recentAttendance = attendance.data?.data?.[0];
  const quickLinks = [
    { label: "Browse Events", to: "/events", icon: CalendarDays },
    { label: "My Registrations", to: "/registrations/mine", icon: ClipboardList },
    { label: "Check In", to: "/attendance/mine", icon: QrCode },
    { label: "Notifications", to: "/notifications", icon: Bell },
    { label: "Profile", to: "/profile", icon: UserRound },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
              Student Home
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102858] dark:text-white">
              Welcome back, {user?.full_name?.split(" ")[0] ?? "there"}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-navy-300">
              Your college feed, registrations, check-ins, and event updates are ready from one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/events">
                <Button>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Find an event
                </Button>
              </Link>
              <Link to="/attendance/mine">
                <Button variant="secondary">
                  <QrCode className="mr-2 h-4 w-4" />
                  Check in
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-slate-200 bg-slate-50 dark:border-navy-800 dark:bg-navy-900 lg:border-l lg:border-t-0">
            <Metric label="Upcoming" value={isLoading ? "..." : (stats?.upcoming_events ?? 0)} />
            <Metric label="Registered" value={isLoading ? "..." : (stats?.my_registrations ?? 0)} />
            <Metric label="Unread" value={isLoading ? "..." : (stats?.notifications ?? 0)} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <Card className="flex h-full items-center gap-3 border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-950 dark:shadow-none dark:hover:border-blue-900 dark:hover:bg-navy-900">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-[#102858] dark:text-white">{item.label}</span>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <BulletinFeed
            title="Bulletin feed"
            description="Latest college notices and event cards in the same social-feed style."
            compact
            showHero={false}
            showHeader={false}
          />
        </div>
        <div className="space-y-5">
          <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#102858] dark:text-white">Next events</h2>
              <Link to="/events" className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {upcoming.isLoading && <p className="text-sm text-navy-500 dark:text-navy-400">Loading events...</p>}
              {!upcoming.isLoading && nextEvents.length === 0 && (
                <p className="text-sm text-navy-500 dark:text-navy-400">No upcoming events are open right now.</p>
              )}
              {nextEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="block rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-900">
                  <span className="block text-sm font-semibold text-[#102858] dark:text-white">{event.title}</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-navy-400">
                    {event.start_time ? new Date(event.start_time).toLocaleString() : "Schedule to be announced"}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-2">
                    {event.category && <StatusBadge tone="neutral">{event.category}</StatusBadge>}
                    {event.is_team_event && <StatusBadge tone="info">Team</StatusBadge>}
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-[#102858] dark:text-white">Attendance</h2>
                <p className="text-sm text-slate-500 dark:text-navy-300">
                  {recentAttendance
                    ? `${recentAttendance.event_title ?? "Latest event"}: ${recentAttendance.status}`
                    : "No attendance records yet."}
                </p>
              </div>
            </div>
            <Link to="/attendance/mine" className="mt-4 block">
              <Button variant="secondary" className="w-full">
                <QrCode className="mr-2 h-4 w-4" />
                Open check-in
              </Button>
            </Link>
          </Card>
        </div>
      </section>
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
