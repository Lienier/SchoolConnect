/** Event detail page: info, register, and (for staff) approve + roster. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { eventsApi, registrationsApi } from "@/features/events/services/eventsApi";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/providers/ToastProvider";

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
      <main className="container mx-auto px-4 py-8">
        <p className="text-accent">Loading…</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto min-h-screen max-w-3xl px-4 py-8">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy-800">
              {event.title}
            </h1>
            {event.category && (
              <span className="mt-1 inline-block rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-600">
                {event.category}
              </span>
            )}
          </div>
          <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-medium text-navy-700">
            {event.status.replace("_", " ")}
          </span>
        </div>

        {event.description && (
          <p className="mt-4 text-sm text-navy-700">{event.description}</p>
        )}

        <dl className="mt-6 grid grid-cols-1 gap-3 text-sm text-navy-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-navy-500">Starts</dt>
            <dd>{formatDate(event.start_time)}</dd>
          </div>
          <div>
            <dt className="font-medium text-navy-500">Ends</dt>
            <dd>{formatDate(event.end_time)}</dd>
          </div>
          <div>
            <dt className="font-medium text-navy-500">Location</dt>
            <dd>{event.location ?? "TBD"}</dd>
          </div>
          <div>
            <dt className="font-medium text-navy-500">Capacity</dt>
            <dd>{event.capacity ?? "Unlimited"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {["approved", "ongoing"].includes(event.status) && (
            <Button onClick={handleRegister}>Register</Button>
          )}
          {isApprover && event.status === "pending_approval" && (
            <>
              <Button onClick={() => handleDecideEvent("approved")}>
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDecideEvent("rejected")}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </Card>

      {isManager && (
        <Card className="mt-6 p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy-800">
            Registrations
          </h2>
          {(roster?.data ?? []).length === 0 ? (
            <p className="text-sm text-accent">No registrations yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {roster?.data.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="text-navy-700">
                    {r.user_id.slice(0, 8)}… ·{" "}
                    <span className="font-medium">{r.status}</span>
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
  );
}
