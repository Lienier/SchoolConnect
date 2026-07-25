/** Student Council Officer dashboard: proposals, drafts, pending approvals. */
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/features/dashboard/services/dashboardApi";
import { QuickLink, SectionCard, StatCard } from "@/features/dashboards/shared/widgets";

export default function OfficerDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats", "officer"],
    queryFn: () => dashboardApi.stats(["my_events", "pending_approvals", "draft_announcements"]),
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold text-navy-800">Student Council Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="My Events" value={isLoading ? "—" : (stats?.my_events ?? 0)} />
        <StatCard label="Pending Approvals" value={isLoading ? "—" : (stats?.pending_approvals ?? 0)} />
        <StatCard label="Draft Announcements" value={isLoading ? "—" : (stats?.draft_announcements ?? 0)} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <SectionCard title="Student Council" action={{ label: "Propose Event", to: "/events/new" }}>
          <div className="flex flex-wrap gap-2">
            <QuickLink label="Propose Event" to="/events/new" variant="secondary" />
            <QuickLink label="My Events" to="/events" variant="secondary" />
            <QuickLink label="Draft Announcements" to="/announcements" variant="secondary" />
            <QuickLink label="My Registrations" to="/registrations/mine" variant="secondary" />
          </div>
        </SectionCard>

        <SectionCard title="Discover">
          <div className="flex flex-wrap gap-2">
            <QuickLink label="Browse Events" to="/events" variant="secondary" />
            <QuickLink label="Announcements" to="/announcements" variant="secondary" />
          </div>
        </SectionCard>
      </div>
    </>
  );
}