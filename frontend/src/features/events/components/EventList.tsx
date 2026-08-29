/** Grid of event cards with an empty state. */
import { type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { EventCard } from "@/features/events/components/EventCard";
import type { SchoolEvent } from "@/features/events/types";

export function EventList({
  items,
  renderActions,
}: {
  items: SchoolEvent[];
  renderActions?: (event: SchoolEvent) => ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-200 p-10 text-center text-accent">
        No events yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((e) => (
        <EventCard
          key={e.id}
          title={e.title}
          description={e.description || undefined}
          startDate={e.start_time || ""}
          endDate={e.end_time || undefined}
          location={e.location || undefined}
          capacity={e.capacity || undefined}
          isTeamEvent={e.is_team_event}
          maxTeamSize={e.max_team_size || undefined}
          registrationDeadline={e.registration_deadline}
          approvalRequired={e.approval_required}
          status={e.status}
          category={e.category}
          imageUrl={e.banner_url}
          actions={renderActions ? renderActions(e) : <Link to={`/events/${e.id}`}><Button size="sm" variant="secondary">View details</Button></Link>}
        />
      ))}
    </div>
  );
}
