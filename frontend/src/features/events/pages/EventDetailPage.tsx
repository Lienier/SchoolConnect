/** Event detail page: info, register, and (for staff) approve + roster. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { Calendar, MapPin, Users, Clock, Shield, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { eventsApi, registrationsApi } from "@/features/events/services/eventsApi";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/providers/ToastProvider";
import { Navbar } from "@/components/ui/Navbar";

function formatDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default function EventDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isApprover = user?.roles?.some((r) => ["admin", "teacher"].includes(r));
  const isManager = user?.roles?.some((r) =>
    ["admin", "teacher", "student_council"].includes(r),
  );

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.get(id),
    enabled: Boolean(id),
  });

  const { data: roster } = useQuery({
    queryKey: ["event-registrations", id],
    queryFn: () => registrationsApi.listForEvent(id),
    enabled: Boolean(id) && Boolean(isManager),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["event", id] });
    queryClient.invalidateQueries({ queryKey: ["event-registrations", id] });
  };

  const handleRegister = async () => {
    try {
      const reg = await registrationsApi.register(id);
      toast(`Registration ${reg.status}.`, "success");
      refresh();
    } catch {
      toast("Could not register. You may already be registered.", "error");
    }
  };

  const handleDecideEvent = async (decision: "approved" | "rejected") => {
    try {
      await eventsApi.approve(id, decision);
      toast(`Event ${decision}.`, "success");
      refresh();
    } catch {
      toast("Could not update the event.", "error");
    }
  };

  const handleDecideReg = async (
    regId: string,
    decision: "approved" | "rejected",
  ) => {
    try {
      await registrationsApi.decide(regId, decision);
      toast(`Registration ${decision}.`, "success");
      refresh();
    } catch {
      toast("Could not update registration.", "error");
    }
  };

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-navy-50">
        <Navbar title="Event Detail" breadcrumbs={[{ label: "Events", href: "/events" }]} />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="text-center text-navy-500 py-8">Loading…</div>
        </main>
      </div>
    );
  }

  const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
    draft: "neutral",
    pending_approval: "warning",
    approved: "success",
    ongoing: "info",
    completed: "info",
    cancelled: "danger",
    archived: "neutral",
  };

  return (
    <div className="min-h-screen bg-navy-50">
      <Navbar
        title={event.title}
        breadcrumbs={[
          { label: "Events", href: "/events" },
          { label: event.title },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-2xl font-semibold text-navy-800 truncate">{event.title}</h1>
                {event.category && (
                  <Badge tone="neutral" className="text-xs">
                    {event.category}
                  </Badge>
                )}
              </div>
              <Badge
                tone={statusTones[event.status] ?? "neutral"}
                className="text-xs"
              >
                {event.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {event.description && (
            <p className="mt-4 text-sm text-navy-600">{event.description}</p>
          )}

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-navy-400 shrink-0" />
              <div>
                <dt className="text-xs font-medium text-navy-500">Starts</dt>
                <dd className="text-sm text-navy-800">{formatDate(event.start_time)}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-navy-400 shrink-0" />
              <div>
                <dt className="text-xs font-medium text-navy-500">Ends</dt>
                <dd className="text-sm text-navy-800">{formatDate(event.end_time)}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-navy-400 shrink-0" />
              <div>
                <dt className="text-xs font-medium text-navy-500">Location</dt>
                <dd className="text-sm text-navy-800">{event.location ?? "TBD"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-navy-400 shrink-0" />
              <div>
                <dt className="text-xs font-medium text-navy-500">Capacity</dt>
                <dd className="text-sm text-navy-800">{event.capacity ?? "Unlimited"}</dd>
              </div>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {["approved", "ongoing"].includes(event.status) && (
              <Button onClick={handleRegister}>
                <Users className="mr-2 h-4 w-4" />
                Register
              </Button>
            )}
            {isApprover && event.status === "pending_approval" && (
              <>
                <Button onClick={() => handleDecideEvent("approved")}>
                  <Shield className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="danger" onClick={() => handleDecideEvent("rejected")}>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </Card>

        {isManager && (
          <Card className="mt-6 p-6">
            <h2 className="mb-4 text-lg font-semibold text-navy-800">Registrations</h2>
            {(roster?.data ?? []).length === 0 ? (
              <p className="text-sm text-navy-500">No registrations yet.</p>
            ) : (
              <ul className="divide-y divide-navy-100">
                {roster?.data.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <span className="text-navy-700">
                      {r.user_id.slice(0, 8)}
                      <span className="ml-2 font-medium">{r.status}</span>
                    </span>
                    {r.status === "pending" && (
                      <span className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDecideReg(r.id, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDecideReg(r.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}