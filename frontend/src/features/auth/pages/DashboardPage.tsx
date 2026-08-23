/** Authenticated dashboard: stat widgets + role-based quick navigation. */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BulletinFeed } from "@/features/announcements/components/BulletinFeed";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { dashboardApi } from "@/features/dashboard/services/dashboardApi";

const WIDGETS: { key: string; label: string }[] = [
  { key: "total_users", label: "Total Users" },
  { key: "total_students", label: "Students" },
  { key: "active_events", label: "Active Events" },
  { key: "total_announcements", label: "Announcements" },
  { key: "pending_event_approvals", label: "Pending Event Approvals" },
  { key: "pending_announcement_approvals", label: "Pending Announcements" },
  { key: "open_registrations", label: "Open Registrations" },
];

const ADMIN_LINKS: { label: string; to: string; perm: string }[] = [
  { label: "User Management", to: "/users", perm: "users.view" },
  { label: "Roles & Permissions", to: "/roles", perm: "roles.view" },
  { label: "School Structure", to: "/school", perm: "departments.view" },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { can } = usePermissions();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.stats(),
  });

  return (
    <main className="container mx-auto min-h-screen px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-800">Dashboard</h1>
          <p className="mt-1 text-accent">
            Signed in as <span className="font-medium text-navy-700">{user?.full_name}</span>
          </p>
        </div>
        <Button variant="secondary" onClick={() => logout()}>
          Sign Out
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WIDGETS.map((w) => (
          <Card key={w.key} className="p-5">
            <p className="text-sm text-navy-500">{w.label}</p>
            <p className="mt-2 text-3xl font-semibold text-navy-800">
              {isLoading ? "â€¦" : (stats?.[w.key] ?? 0)}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-semibold text-navy-800">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            <Link to="/announcements">
              <Button>Announcements</Button>
            </Link>
            <Link to="/events">
              <Button variant="secondary">Events</Button>
            </Link>
            <Link to="/registrations/mine">
              <Button variant="secondary">My Registrations</Button>
            </Link>
          </div>
        </Card>

        {can("users.view") && (
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold text-navy-800">Administration</h2>
            <div className="flex flex-wrap gap-2">
              {ADMIN_LINKS.filter((l) => can(l.perm)).map((l) => (
                <Link key={l.to} to={l.to}>
                  <Button variant="secondary">{l.label}</Button>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <BulletinFeed
          title="School bulletin"
          description="Recent announcements and approved events in the same social-style stream."
          compact
          showHero={false}
        />
      </div>
    </main>
  );
}
