/** Events list page with status filter. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { eventsApi } from "@/features/events/services/eventsApi";
import { EventList } from "@/features/events/components/EventList";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Plus, Clock } from "lucide-react";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "approved", label: "Upcoming" },
  { key: "pending_approval", label: "Pending" },
  { key: "completed", label: "Past" },
];

export default function EventsPage() {
  const [status, setStatus] = useState("");
  const { user } = useAuth();
  const canCreate = user?.roles?.some((r) =>
    ["admin", "teacher", "student_council", "student"].includes(r),
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["events", status],
    queryFn: () => eventsApi.list({ page: 1, status: status || undefined }),
  });

  const items = data?.data ?? [];

  return (
    <div className="min-h-screen bg-navy-50">
      <header className="border-b border-navy-100 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-navy-800">Events</h1>
              <p className="mt-1 text-sm text-navy-500">Browse and manage school events</p>
            </div>
            <div className="flex gap-2">
              <Link to="/registrations/mine">
                <Button variant="secondary" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  My Registrations
                </Button>
              </Link>
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
          <div className="mt-4 inline-flex rounded-xl border border-navy-200 bg-white p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={
                  "rounded-lg px-4 py-1.5 text-sm font-medium " +
                  (status === t.key
                    ? "bg-navy-800 text-white"
                    : "text-navy-700 hover:bg-navy-50")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        {isLoading && <div className="text-center text-navy-500 py-8">Loading…</div>}
        {isError && (
          <div className="text-center text-red-600 py-8">
            Failed to load events. You may lack permission.
          </div>
        )}
        {!isLoading && !isError && <EventList items={items} />}
      </main>
    </div>
  );
}