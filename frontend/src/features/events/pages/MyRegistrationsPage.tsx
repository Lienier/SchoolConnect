/** Current user's registrations with cancel action. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { registrationsApi } from "@/features/events/services/eventsApi";
import { useToast } from "@/providers/ToastProvider";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  waitlisted: "bg-blue-100 text-blue-700",
  cancelled: "bg-navy-100 text-navy-500",
  attended: "bg-emerald-100 text-emerald-700",
  absent: "bg-red-100 text-red-700",
};

export default function MyRegistrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: () => registrationsApi.mine(1),
  });

  const handleCancel = async (id: string) => {
    try {
      await registrationsApi.cancel(id);
      toast("Registration cancelled.", "success");
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    } catch {
      toast("Could not cancel registration.", "error");
    }
  };

  const items = data?.data ?? [];

  return (
    <main className="container mx-auto min-h-screen max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-800">
          My Registrations
        </h1>
        <Link to="/events">
          <Button variant="secondary">Browse Events</Button>
        </Link>
      </div>

      {isLoading && <p className="text-accent">Loading…</p>}
      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-navy-200 p-10 text-center text-accent">
          You have not registered for any events yet.
        </div>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <Link
                to={`/events/${r.event_id}`}
                className="text-sm font-medium text-navy-800 hover:underline"
              >
                Event {r.event_id.slice(0, 8)}…
              </Link>
              <p className="mt-1 text-xs text-accent">
                Registered {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={
                  "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                  (statusStyles[r.status] ?? statusStyles.pending)
                }
              >
                {r.status}
              </span>
              {["pending", "approved", "waitlisted"].includes(r.status) && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleCancel(r.id)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
