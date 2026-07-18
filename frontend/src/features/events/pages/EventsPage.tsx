/** Events list page with status filter. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { eventsApi } from "@/features/events/services/eventsApi";
import { EventList } from "@/features/events/components/EventList";
import { useAuth } from "@/features/auth/context/AuthContext";

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
    <main className="container mx-auto min-h-screen px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-800">Events</h1>
          <div className="mt-3 inline-flex rounded-xl border border-navy-200 bg-white p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={
                  "rounded-lg px-4 py-1.5 text-sm font-medium " +
                  (status === t.key
                    ? "bg-navy-800 text-white"
                    : "text-navy-700")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/registrations/mine">
            <Button variant="secondary">My Registrations</Button>
          </Link>
          {canCreate && (
            <Link to="/events/new">
              <Button>New Event</Button>
            </Link>
          )}
        </div>
      </div>

      {isLoading && <p className="text-accent">Loading…</p>}
      {isError && (
        <p className="text-red-600">
          Failed to load events. You may lack permission.
        </p>
      )}
      {!isLoading && !isError && <EventList items={items} />}
    </main>
  );
}
