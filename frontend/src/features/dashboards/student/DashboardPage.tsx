/** Student dashboard: announcements, upcoming events, registrations, profile. */
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/features/dashboard/services/dashboardApi";
import { QuickLink, SectionCard, StatCard } from "@/features/dashboards/shared/widgets";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats", "student"],
    queryFn: () => dashboardApi.stats(["upcoming_events", "my_registrations", "notifications"]),
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-navy-800">
          Welcome back, {user?.full_name?.split(" ")[0] ?? "Student"}!
        </h1>
        <p className="mt-1 text-sm text-navy-500">Here's what's happening at your school</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Upcoming Events"
          value={isLoading ? "—" : (stats?.upcoming_events ?? 0)}
        />
        <StatCard
          label="My Registrations"
          value={isLoading ? "—" : (stats?.my_registrations ?? 0)}
        />
        <StatCard label="Notifications" value={isLoading ? "—" : (stats?.notifications ?? 0)} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Get Involved" action={{ label: "Browse", to: "/events" }}>
          <div className="flex flex-wrap gap-2">
            <QuickLink label="Browse Events" to="/events" variant="secondary" />
            <QuickLink label="My Registrations" to="/registrations/mine" variant="secondary" />
            <QuickLink label="Attendance QR" to="/attendance" variant="secondary" />
          </div>
        </SectionCard>

        <SectionCard title="Stay Informed" action={{ label: "View All", to: "/announcements" }}>
          <div className="flex flex-wrap gap-2">
            <QuickLink label="Announcements" to="/announcements" variant="secondary" />
            <QuickLink label="Notifications" to="/notifications" variant="secondary" />
          </div>
        </SectionCard>

        <SectionCard title="Achievements" action={{ label: "View All", to: "/certificates" }}>
          <div className="flex flex-wrap gap-2">
            <QuickLink label="Certificates" to="/certificates" variant="secondary" />
            <QuickLink label="History" to="/history" variant="secondary" />
          </div>
        </SectionCard>
      </div>
    </>
  );
}