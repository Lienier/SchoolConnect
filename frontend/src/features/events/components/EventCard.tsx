/** Event card with modern design system components. */
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Users, Calendar, Shield } from "lucide-react";

interface EventCardProps {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  capacity?: number;
  registeredCount?: number;
  isTeamEvent?: boolean;
  maxTeamSize?: number;
  status?: "draft" | "published" | "cancelled" | "completed";
  priority?: "normal" | "important" | "urgent";
  category?: string;
  actions?: ReactNode;
  className?: string;
}


export function EventCard({
  title,
  description,
  startDate,
  endDate,
  location,
  capacity,
  registeredCount,
  isTeamEvent,
  maxTeamSize,
  status = "published",
  priority = "normal",
  category,
  actions,
  className,
}: EventCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card className={cn("p-5 transition-shadow hover:shadow-soft", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-navy-800 truncate">{title}</h3>
            {category && (
              <Badge tone="neutral" className="text-xs">
                {category}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-2 line-clamp-2 text-sm text-navy-500">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            tone={
              status === "published"
                ? "success"
                : status === "draft"
                ? "neutral"
                : status === "cancelled"
                ? "danger"
                : "info"
            }
            className="text-xs"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          <Badge tone="neutral" className="text-xs">
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2 text-navy-600">
          <Calendar className="h-4 w-4 text-navy-400 shrink-0" />
          <div>
            <p className="font-medium text-navy-800">{formatDate(startDate)}</p>
            <p className="text-xs text-navy-500">
              {formatTime(startDate)} {endDate ? `– ${formatTime(endDate)}` : ""}
            </p>
          </div>
        </div>
        {location && (
          <div className="flex items-center gap-2 text-navy-600">
            <Calendar className="h-4 w-4 text-navy-400 shrink-0" />
            <p className="truncate font-medium text-navy-800">{location}</p>
          </div>
        )}
        {capacity && (
          <div className="flex items-center gap-2 text-navy-600">
            <Users className="h-4 w-4 text-navy-400 shrink-0" />
            <div>
              <p className="font-medium text-navy-800">
                {registeredCount ?? 0} / {capacity}
              </p>
              <p className="text-xs text-navy-500">Seats filled</p>
            </div>
          </div>
        )}
        {isTeamEvent && (
          <div className="flex items-center gap-2 text-navy-600">
            <Shield className="h-4 w-4 text-navy-400 shrink-0" />
            <div>
              <p className="font-medium text-navy-800">Team Event</p>
              <p className="text-xs text-navy-500">Up to {maxTeamSize} members</p>
            </div>
          </div>
        )}
      </div>

      {actions && (
        <div className="mt-4 flex items-center justify-end gap-2">{actions}</div>
      )}
    </Card>
  );
}