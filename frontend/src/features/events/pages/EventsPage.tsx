/** Events list page with student-friendly filters. */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Plus, Shield, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EventList } from "@/features/events/components/EventList";
import { eventsApi } from "@/features/events/services/eventsApi";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/utils/cn";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "approved", label: "Upcoming" },
  { key: "ongoing", label: "Happening Now" },
  { key: "completed", label: "Past" },
  { key: "pending_approval", label: "Pending" },
];

export default function EventsPage() {
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [teamOnly, setTeamOnly] = useState(false);
  const { user } = useAuth();
  const isStudent = Boolean(user?.roles?.includes("student"));
  const isProfessor = Boolean(user?.roles?.includes("teacher"));
  const canCreate = user?.roles?.some((r) => ["admin", "teacher", "student_council"].includes(r));
  const visibleStatusTabs = STATUS_TABS.filter((tab) => isStudent ? ["", "approved", "ongoing", "completed"].includes(tab.key) : true);

  const categories = useQuery({
    queryKey: ["events", "categories"],
    queryFn: eventsApi.listCategories,
  });
  const { data, isLoading, isError } = useQuery({
    queryKey: ["events", status, categoryId, isProfessor ? user?.id : "all"],
    queryFn: () => eventsApi.list({
      page: 1,
      status: status || undefined,
      category_id: categoryId || undefined,
      organizer_id: isProfessor ? user?.id : undefined,
    }),
    enabled: !isProfessor || Boolean(user?.id),
  });

  const items = useMemo(
    () => (data?.data ?? []).filter((event) => !teamOnly || event.is_team_event),
    [data?.data, teamOnly],
  );

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                Event Discovery
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#102858]">Events</h1>
              <p className="mt-1 text-sm text-slate-500">
                {isProfessor
                  ? "Manage your event proposals, approved rosters, and attendance-ready events."
                  : "Browse approved school events, join team activities, and track registration deadlines."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isProfessor && <Link to="/registrations/mine">
                <Button variant="secondary" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  My Registrations
                </Button>
              </Link>}
              {canCreate && (
                <Link to="/events/new">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Event
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {visibleStatusTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatus(tab.key)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    status === tab.key
                      ? "bg-[#0d5ee8] text-white shadow-sm"
                      : "bg-slate-100 text-[#102858] hover:bg-slate-200",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-[#102858] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTeamOnly((value) => !value)}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
                  teamOnly
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-[#102858] hover:bg-slate-50",
                )}
              >
                <Users className="h-4 w-4" />
                Team only
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
          <span className="flex items-center justify-center gap-1 p-3"><CalendarDays className="h-4 w-4" />Schedule</span>
          <span className="flex items-center justify-center gap-1 p-3"><Shield className="h-4 w-4" />Eligibility</span>
          <span className="flex items-center justify-center gap-1 p-3"><Users className="h-4 w-4" />Teams</span>
        </div>
      </header>

      <main>
        {isLoading && <Card className="p-8 text-center text-navy-500">Loading events...</Card>}
        {isError && (
          <Card className="border-red-200 bg-red-50 p-8 text-center text-red-700">
            Failed to load events. You may lack permission.
          </Card>
        )}
        {!isLoading && !isError && <EventList items={items} />}
      </main>
    </div>
  );
}
