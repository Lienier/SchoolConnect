/** Single announcement card shown in lists/feed. */
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/utils/cn";
import type { Announcement } from "@/features/announcements/types";

const priorityTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  normal: "neutral",
  important: "warning",
  urgent: "danger",
};

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  published: "success",
  draft: "neutral",
  archived: "info",
  pending_approval: "warning",
  rejected: "danger",
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
            <Badge tone="neutral" className="mt-1 text-xs">
              {announcement.category}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={priorityTones[announcement.priority] ?? "neutral"} className="text-xs">
            {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
          </Badge>
          <Badge tone={statusTones[announcement.status] ?? "neutral"} className="text-xs">
            {announcement.status.replace("_", " ")}
          </Badge>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-navy-500">
        {announcement.summary ?? announcement.body}
      </p>
      {announcement.status !== "published" && (
        <p className="mt-3 text-xs font-medium text-navy-500">
          Status: {announcement.status.replace("_", " ")}
        </p>
      )}
    </Card>
  );
}