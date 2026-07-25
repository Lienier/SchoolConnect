/** Current user's registrations with cancel action. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { registrationsApi } from "@/features/events/services/eventsApi";
import { useToast } from "@/providers/ToastProvider";
import { Navbar } from "@/components/ui/Navbar";

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  waitlisted: "info",
  cancelled: "neutral",
  attended: "success",
  absent: "danger",
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
    <div className="min-h-screen bg-navy-50">
      <Navbar
        title="My Registrations"
        breadcrumbs={[
          { label: "Events", href: "/events" },
          { label: "My Registrations" },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        {isLoading && <div className="text-center text-navy-500 py-8">Loading…</div>}

        {!isLoading && items.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-navy-200 p-10 text-center">
            <Calendar className="mx-auto h-12 w-12 text-navy-200" />
            <h3 className="mt-4 text-lg font-medium text-navy-800">No registrations yet</h3>
            <p className="mt-2 text-navy-500">You haven't registered for any events.</p>
            <Link to="/events" className="mt-6 inline-block">
              <Button>
                <Calendar className="mr-2 h-4 w-4" />
                Browse Events
              </Button>
            </Link>
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
                <p className="mt-1 text-xs text-navy-500">
                  Registered {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge tone={statusTones[r.status] ?? "neutral"} className="text-xs">
                  {r.status}
                </Badge>
                {["pending", "approved", "waitlisted"].includes(r.status) && (
                  <Button size="sm" variant="danger" onClick={() => handleCancel(r.id)}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}