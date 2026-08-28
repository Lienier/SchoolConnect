/** Current user's registrations with mobile-first status cards. */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Copy, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { apiErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { PageHeader } from "@/components/ui/AdminPrimitives";
import { registrationsApi } from "@/features/events/services/eventsApi";
import type { Registration } from "@/features/events/types";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/utils/cn";

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  waitlisted: "info",
  cancelled: "neutral",
  attended: "success",
  absent: "danger",
};

const filters = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "cancelled", label: "Cancelled" },
  { key: "past", label: "Past" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

export default function MyRegistrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("active");
  const [cancelTarget, setCancelTarget] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: () => registrationsApi.mine(1),
  });

  const filtered = useMemo(() => {
    const items = data?.data ?? [];
    return items.filter((registration) => {
      if (activeFilter === "active") return ["approved"].includes(registration.status);
      if (activeFilter === "past") return ["attended", "absent", "rejected"].includes(registration.status);
      return registration.status === activeFilter;
    });
  }, [activeFilter, data?.data]);

  const handleCancel = async (id: string) => {
    try {
      await registrationsApi.cancel(id);
      toast("Registration cancelled.", "success");
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast(apiErrorMessage(error, "Could not cancel registration."), "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Registrations"
        subtitle="Track your event sign-ups, team codes, waitlists, and cancellations."
        actions={
          <Link to="/events">
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              Browse Events
            </Button>
          </Link>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActiveFilter(filter.key)}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition",
              activeFilter === filter.key
                ? "bg-[#0d5ee8] text-white shadow-sm"
                : "bg-white text-[#102858] shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-navy-950 dark:text-navy-100 dark:ring-navy-800 dark:hover:bg-navy-900",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading && <Card className="border-slate-200 p-8 text-center text-slate-500 shadow-sm">Loading registrations...</Card>}
      {isError && <Card className="border-red-200 bg-red-50 p-8 text-center text-red-700">Could not load your registrations.</Card>}
      {!isLoading && !isError && filtered.length === 0 && (
        <Card className="border-dashed border-slate-200 bg-white p-10 text-center shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
          <Calendar className="mx-auto h-12 w-12 text-navy-200" />
          <h3 className="mt-4 text-lg font-semibold text-[#102858] dark:text-white">No registrations here</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">Try another filter or browse open events.</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((registration) => (
          <RegistrationCard
            key={registration.id}
            registration={registration}
            onCancel={() => setCancelTarget({ id: registration.id, title: registration.event_title ?? "this event" })}
          />
        ))}
      </div>

      <ConfirmActionModal
        open={Boolean(cancelTarget)}
        title="Cancel registration"
        description="This will cancel your registration and remove you from the active roster for this event."
        itemName={cancelTarget?.title}
        confirmLabel="Cancel Registration"
        confirmVariant="danger"
        onCancel={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (cancelTarget) await handleCancel(cancelTarget.id);
          setCancelTarget(null);
        }}
      />
    </div>
  );
}

function RegistrationCard({ registration, onCancel }: { registration: Registration; onCancel: () => void }) {
  const { toast } = useToast();
  const canCancel = ["pending", "approved", "waitlisted"].includes(registration.status);
  const copyCode = async () => {
    if (!registration.team_code) return;
    const copied = await copyText(registration.team_code);
    toast(copied ? "Team code copied." : "Copy was blocked. Long-press the code and copy it manually.", copied ? "success" : "warning");
  };

  return (
    <Card className="flex h-full flex-col border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/events/${registration.event_id}`} className="text-lg font-semibold text-[#102858] hover:underline dark:text-white">
            {registration.event_title ?? `Event ${registration.event_id.slice(0, 8)}`}
          </Link>
          <p className="mt-1 text-xs text-slate-500 dark:text-navy-400">Registered {new Date(registration.created_at).toLocaleString()}</p>
        </div>
        <Badge tone={statusTones[registration.status] ?? "neutral"} className="shrink-0 text-xs">
          {registration.status}
        </Badge>
      </div>

      {registration.team_name && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <div className="flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4" />
            {registration.team_name}
            {registration.team_role && <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{registration.team_role}</span>}
          </div>
          {registration.team_code && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 font-mono font-semibold dark:bg-navy-950 dark:text-white">
              {registration.team_code}
              <Button size="sm" variant="secondary" onClick={copyCode}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap justify-end gap-2 pt-4">
        <Link to={`/events/${registration.event_id}`}>
          <Button size="sm" variant="secondary">Details</Button>
        </Link>
        {canCancel && (
          <Button size="sm" variant="danger" onClick={onCancel}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy path for mobile browsers.
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  input.style.top = "0";
  document.body.appendChild(input);
  input.focus();
  input.select();
  input.setSelectionRange(0, value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(input);
  return copied;
}
