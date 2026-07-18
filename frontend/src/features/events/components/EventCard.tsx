/** Single event card shown in the events list. */
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";
import type { SchoolEvent } from "@/features/events/types";

const statusStyles: Record<string, string> = {
  draft: "bg-navy-100 text-navy-700",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  ongoing: "bg-blue-100 text-blue-700",
  completed: "bg-navy-100 text-navy-600",
  cancelled: "bg-red-100 text-red-700",
  archived: "bg-navy-100 text-navy-500",
};

function formatDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function EventCard({ event }: { event: SchoolEvent }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/events/${event.id}`}>
            <h3 className="text-lg font-semibold text-navy-800 hover:underline">
              {event.title}
            </h3>
          </Link>
          {event.category && (
            <span className="mt-1 inline-block rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-600">
              {event.category}
            </span>
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            statusStyles[event.status] ?? statusStyles.draft,
          )}
        >
          {event.status.replace("_", " ")}
        </span>
      </div>
      {event.description && (
        <p className="mt-3 line-clamp-2 text-sm text-accent">
          {event.description}
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-navy-600">
        <div>
          <dt className="font-medium text-navy-500">When</dt>
          <dd>{formatDate(event.start_time)}</dd>
        </div>
        <div>
          <dt className="font-medium text-navy-500">Where</dt>
          <dd>{event.location ?? "TBD"}</dd>
        </div>
        {event.capacity != null && (
          <div>
            <dt className="font-medium text-navy-500">Capacity</dt>
            <dd>{event.capacity}</dd>
          </div>
        )}
        {event.is_team_event && (
          <div>
            <dt className="font-medium text-navy-500">Team event</dt>
            <dd>Up to {event.max_team_size}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
