/** Grid of announcement cards with an empty state. */
import { AnnouncementCard } from "@/features/announcements/components/AnnouncementCard";
import type { Announcement } from "@/features/announcements/types";

export function AnnouncementList({ items }: { items: Announcement[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-200 p-10 text-center text-accent">
        No announcements yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} />
      ))}
    </div>
  );
}
