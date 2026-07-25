/** Teacher / Event Coordinator dashboard: assigned events, approvals, attendance. */
import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "@/features/dashboard/services/dashboardApi";
import { QuickLink, SectionCard, StatCard } from "@/features/dashboards/shared/widgets";

export default function TeacherDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats", "teacher"],
    queryFn: () => dashboardApi.stats(["active_events", "open_registrations", "pending_event_approvals"]),
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold text-navy-800">Teacher Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Events" value={isLoading ? "—" : (stats?.active_events ?? 0)} />
        <StatCard label="Open Registrations" value={isLoading ? "—" : (stats?.open_registrations ?? 0)} />
        <StatCard
          label="Pending Approvals"
          value={isLoading ? "—" : (stats?.pending_event_approvals ?? 0)}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <SectionCard title="My Events" action={{ label: "New", to: "/events/new" }}>
          <div className="flex flex-wrap gap-2">
            <QuickLink label="View Events" to="/events" variant="secondary" />
            <QuickLink label="Create Event" to="/events/new" variant="secondary" />
          </div>
        </SectionCard>

        <SectionCard title="Participants & Attendance">
          <div className="flex flex-wrap gap-2">
            <QuickLink label="Registrations" to="/registrations/mine" variant="secondary" />
            <QuickLink label="Reports" to="/reports" variant="secondary" />
          </div>
        </SectionCard>
      </div>
    </>
  );
}