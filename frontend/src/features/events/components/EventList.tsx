/** Grid of event cards with an empty state. */
import { EventCard } from "@/features/events/components/EventCard";
import type { SchoolEvent } from "@/features/events/types";

export function EventList({ items }: { items: SchoolEvent[] }) {
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
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}
