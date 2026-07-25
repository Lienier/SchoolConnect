/** Administrator dashboard: system-wide stats, management shortcuts, audit. */
import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "@/features/dashboard/services/dashboardApi";
import { usePermissions } from "@/hooks/usePermissions";
import { QuickLink, SectionCard, StatCard } from "@/features/dashboards/shared/widgets";
import { Skeleton } from "@/components/ui/Skeleton";

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
  const { can } = usePermissions();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.stats(),
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold text-navy-800">Administrator Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WIDGETS.map((w) => (
          <StatCard
            key={w.key}
            label={w.label}
            value={isLoading ? <Skeleton variant="rectangular" height={36} className="mt-1 w-2/3" /> : (stats?.[w.key] ?? 0)}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <SectionCard title="Administration" action={{ label: "Manage", to: "/users" }}>
          <div className="flex flex-wrap gap-2">
            {can("users.view") && <QuickLink label="Users" to="/users" variant="secondary" />}
            {can("roles.view") && <QuickLink label="Roles" to="/roles" variant="secondary" />}
            {can("departments.view") && (
              <QuickLink label="School Structure" to="/school" variant="secondary" />
            )}
          </div>
        </SectionCard>

        <SectionCard title="Content & Oversight">
          <div className="flex flex-wrap gap-2">
            <QuickLink label="Announcements" to="/announcements" variant="secondary" />
            <QuickLink label="Events" to="/events" variant="secondary" />
            {can("reports.view") && <QuickLink label="Reports" to="/reports" variant="secondary" />}
            {can("audit.view") && <QuickLink label="Audit Logs" to="/audit/logs" variant="secondary" />}
          </div>
        </SectionCard>
      </div>
    </>
  );
}