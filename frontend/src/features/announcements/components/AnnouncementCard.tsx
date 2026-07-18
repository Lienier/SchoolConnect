/** Single announcement card shown in lists/feed. */
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";
import type { Announcement } from "@/features/announcements/types";

const priorityStyles: Record<string, string> = {
  normal: "bg-navy-100 text-navy-700",
  important: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
};

export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-navy-800">
            {announcement.title}
          </h3>
          {announcement.category && (
            <span className="mt-1 inline-block rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-600">
              {announcement.category}
            </span>
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            priorityStyles[announcement.priority] ?? priorityStyles.normal,
          )}
        >
          {announcement.priority}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-accent">
        {announcement.summary ?? announcement.body}
      </p>
      {announcement.status !== "published" && (
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-accent">
          Status: {announcement.status.replace("_", " ")}
        </p>
      )}
    </Card>
  );
}
