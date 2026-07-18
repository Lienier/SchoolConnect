/** Minimal authenticated dashboard placeholder. */
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
      <Card className="w-full max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-navy-800">Dashboard</h1>
        <p className="mt-2 text-accent">
          Signed in as <span className="font-medium text-navy-700">{user?.full_name}</span>
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {user?.roles?.map((role) => (
            <span
              key={role}
              className="rounded-full bg-navy-100 px-3 py-1 text-xs font-medium text-navy-700"
            >
              {role}
            </span>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/announcements">
            <Button>Announcements</Button>
          </Link>
          <Link to="/events">
            <Button>Events</Button>
          </Link>
          <Link to="/registrations/mine">
            <Button variant="secondary">My Registrations</Button>
          </Link>
        </div>
        <Button variant="secondary" className="mt-4" onClick={() => logout()}>
          Sign Out
        </Button>
      </Card>
    </main>
  );
}
