/** Events list page with student-friendly filters. */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Clock, Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { apiErrorMessage } from "@/api/errors";
import { EventList } from "@/features/events/components/EventList";
import { eventsApi } from "@/features/events/services/eventsApi";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/utils/cn";
import type { SchoolEvent } from "@/features/events/types";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "approved", label: "Upcoming" },
  { key: "ongoing", label: "Happening Now" },
  { key: "completed", label: "Past" },
];

export default function EventsPage() {
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [teamOnly, setTeamOnly] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    message: string;
    itemName: string;
    confirmLabel: string;
    variant?: "primary" | "danger" | "secondary";
    successMessage: string;
    action: () => Promise<unknown>;
  } | null>(null);
  const { user } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isStudent = Boolean(user?.roles?.includes("student"));
  const isProfessor = Boolean(user?.roles?.includes("teacher"));
  const isAdmin = Boolean(user?.roles?.includes("admin"));
  const canCreate = user?.roles?.some((r) => ["admin", "teacher", "student_council"].includes(r));
  const visibleStatusTabs = STATUS_TABS.filter((tab) => isStudent ? ["", "approved", "ongoing", "completed"].includes(tab.key) : true);

  const categories = useQuery({
    queryKey: ["events", "categories"],
    queryFn: eventsApi.listCategories,
  });
  const { data, isLoading, isError } = useQuery({
    queryKey: ["events", status, categoryId, isProfessor ? user?.id : "all"],
    queryFn: () => eventsApi.list({
      page: 1,
      status: status || undefined,
      category_id: categoryId || undefined,
      organizer_id: isProfessor ? user?.id : undefined,
    }),
    enabled: !isProfessor || Boolean(user?.id),
  });
  const actionMutation = useMutation({
    mutationFn: (pending: NonNullable<typeof pendingAction>) => pending.action(),
    onSuccess: (_data, pending) => {
      toast(pending.successMessage, "success");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (error) => toast(apiErrorMessage(error, "Event action failed."), "error"),
  });

  const items = useMemo(
    () => (data?.data ?? []).filter((event) => !teamOnly || event.is_team_event),
    [data?.data, teamOnly],
  );
  const confirm = (
    event: SchoolEvent,
    title: string,
    message: string,
    confirmLabel: string,
    successMessage: string,
    action: () => Promise<unknown>,
    variant: "primary" | "danger" | "secondary" = "primary",
  ) => setPendingAction({ title, message, itemName: event.title, confirmLabel, successMessage, action, variant });
  const renderActions = (event: SchoolEvent) => (
    <>
      <Link to={`/events/${event.id}`}>
        <Button size="sm" variant="secondary">View details</Button>
      </Link>
      {isAdmin && can("events.update") && event.status !== "archived" && (
        <Button size="sm" variant="secondary" onClick={() => confirm(event, "Archive event", "This will hide the event from student event discovery without deleting its record.", "Archive", "Event archived.", () => eventsApi.changeStatus(event.id, "archived"), "secondary")}>
          <Archive className="mr-1.5 h-3.5 w-3.5" />
          Archive
        </Button>
      )}
      {isAdmin && can("events.delete") && (
        <Button size="sm" variant="danger" onClick={() => confirm(event, "Delete event", "This will remove the event from management views and student event discovery.", "Delete", "Event deleted.", () => eventsApi.remove(event.id), "danger")}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
                Event Discovery
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102858] dark:text-white">Events</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-navy-300">
                {isProfessor
                  ? "Manage your event proposals, approved rosters, and attendance-ready events."
                  : "Browse approved college events, join team activities, and track registration deadlines."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isProfessor && <Link to="/registrations/mine">
                <Button variant="secondary" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  My Registrations
                </Button>
              </Link>}
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

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {visibleStatusTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatus(tab.key)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    status === tab.key
                      ? "bg-[#0d5ee8] text-white shadow-sm"
                      : "bg-slate-100 text-[#102858] hover:bg-slate-200 dark:bg-navy-900 dark:text-navy-200 dark:hover:bg-navy-800",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-[#102858] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100"
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTeamOnly((value) => !value)}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                  teamOnly
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300"
                    : "border-slate-200 bg-white text-[#102858] hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100 dark:hover:bg-navy-800",
                )}
              >
                <Users className="h-4 w-4" />
                Team only
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {isLoading && <Card className="p-8 text-center text-navy-500">Loading events...</Card>}
        {isError && (
          <Card className="border-red-200 bg-red-50 p-8 text-center text-red-700">
            Failed to load events. You may lack permission.
          </Card>
        )}
        {!isLoading && !isError && <EventList items={items} renderActions={renderActions} />}
      </main>
      <ConfirmActionModal
        open={!!pendingAction}
        title={pendingAction?.title ?? "Confirm action"}
        description={pendingAction?.message ?? ""}
        itemName={pendingAction?.itemName}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        confirmVariant={pendingAction?.variant}
        isLoading={actionMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) actionMutation.mutate(pendingAction, { onSettled: () => setPendingAction(null) });
        }}
      />
    </div>
  );
}
